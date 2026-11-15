package gr.uoi.ioanninabus;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class BusArrivalWidget extends AppWidgetProvider {

    public static final String ACTION_WIDGET_REFRESH = "gr.uoi.ioanninabus.ACTION_WIDGET_REFRESH";
    public static final String PREFS_NAME = "ioannina_bus_widget_prefs";
    public static final String KEY_STOP_CODE = "widget_stop_code";
    public static final String KEY_STOP_NAME = "widget_stop_name";

    private static final String BASE_WEB_URL = "https://ioannina.citybus.gr/el/stops";
    private static final String BASE_API_URL = "https://rest.citybus.gr/api/v1/el/106/stops/live/";

    private static String sCachedToken = null;
    private static long sTokenExpiry = 0;
    private static final ExecutorService sExecutor = Executors.newSingleThreadExecutor();

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        if (ACTION_WIDGET_REFRESH.equals(intent.getAction())) {
            updateAllWidgets(context);
        }
    }

    public static void updateAllWidgets(Context context) {
        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
        ComponentName thisWidget = new ComponentName(context, BusArrivalWidget.class);
        int[] appWidgetIds = appWidgetManager.getAppWidgetIds(thisWidget);
        for (int id : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, id);
        }
    }

    private static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        final String stopCode = prefs.getString(KEY_STOP_CODE, "930");
        final String stopName = prefs.getString(KEY_STOP_NAME, "Φιλοσοφική (#930)");

        final RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_bus_arrival);
        views.setTextViewText(R.id.widget_stop_name, "📍 " + stopName);

        // Click on widget opens MainActivity
        Intent launchIntent = new Intent(context, MainActivity.class);
        launchIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        launchIntent.putExtra("stopCode", stopCode);
        PendingIntent pendingLaunch = PendingIntent.getActivity(
                context,
                0,
                launchIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_root, pendingLaunch);

        // Click on refresh button triggers ACTION_WIDGET_REFRESH
        Intent refreshIntent = new Intent(context, BusArrivalWidget.class);
        refreshIntent.setAction(ACTION_WIDGET_REFRESH);
        PendingIntent pendingRefresh = PendingIntent.getBroadcast(
                context,
                1,
                refreshIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_refresh_btn, pendingRefresh);

        // Fetch arrivals asynchronously
        sExecutor.execute(() -> {
            try {
                String token = getToken();
                String arrivalsJson = fetchArrivals(stopCode, token);

                JSONObject root = new JSONObject(arrivalsJson);
                JSONArray vehicles = root.optJSONArray("vehicles");

                SimpleDateFormat sdf = new SimpleDateFormat("HH:mm", Locale.getDefault());
                String timeStr = sdf.format(new Date());

                if (vehicles != null && vehicles.length() > 0) {
                    views.setViewVisibility(R.id.widget_empty_text, View.GONE);
                    views.setViewVisibility(R.id.widget_bus_row_1, View.VISIBLE);

                    // First vehicle
                    JSONObject v1 = vehicles.getJSONObject(0);
                    String line1 = v1.optString("lineCode", v1.optString("line", ""));
                    String route1 = v1.optString("routeName", v1.optString("lineName", ""));
                    int mins1 = calculateMinutes(v1);

                    views.setTextViewText(R.id.widget_bus_1_line, line1);
                    views.setTextViewText(R.id.widget_bus_1_route, route1);
                    views.setTextViewText(R.id.widget_bus_1_mins, mins1 <= 0 ? "Τώρα!" : "σε " + mins1 + "'");

                    // Second vehicle (if available)
                    if (vehicles.length() > 1) {
                        views.setViewVisibility(R.id.widget_bus_row_2, View.VISIBLE);
                        JSONObject v2 = vehicles.getJSONObject(1);
                        String line2 = v2.optString("lineCode", v2.optString("line", ""));
                        String route2 = v2.optString("routeName", v2.optString("lineName", ""));
                        int mins2 = calculateMinutes(v2);

                        views.setTextViewText(R.id.widget_bus_2_line, line2);
                        views.setTextViewText(R.id.widget_bus_2_route, route2);
                        views.setTextViewText(R.id.widget_bus_2_mins, mins2 <= 0 ? "Τώρα!" : "σε " + mins2 + "'");
                    } else {
                        views.setViewVisibility(R.id.widget_bus_row_2, View.GONE);
                    }
                } else {
                    views.setViewVisibility(R.id.widget_bus_row_1, View.GONE);
                    views.setViewVisibility(R.id.widget_bus_row_2, View.GONE);
                    views.setViewVisibility(R.id.widget_empty_text, View.VISIBLE);
                }

                views.setTextViewText(R.id.widget_updated_time, "Ενημέρωση: " + timeStr);
                appWidgetManager.updateAppWidget(appWidgetId, views);

            } catch (Exception e) {
                views.setViewVisibility(R.id.widget_bus_row_1, View.GONE);
                views.setViewVisibility(R.id.widget_bus_row_2, View.GONE);
                views.setViewVisibility(R.id.widget_empty_text, View.VISIBLE);
                views.setTextViewText(R.id.widget_empty_text, "Πατήστε 🔄 για ανανέωση");
                appWidgetManager.updateAppWidget(appWidgetId, views);
            }
        });
    }

    private static int calculateMinutes(JSONObject v) {
        int depMins = v.optInt("departureMins", 0);
        int depSecs = v.optInt("departureSeconds", 0);
        int totalSecs = depMins * 60 + depSecs;
        return totalSecs <= 30 ? 0 : (int) Math.ceil((double) totalSecs / 60.0);
    }

    private static synchronized String getToken() throws Exception {
        long now = System.currentTimeMillis();
        if (sCachedToken != null && now < sTokenExpiry) {
            return sCachedToken;
        }

        URL url = new URL(BASE_WEB_URL);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod("GET");
        conn.setConnectTimeout(6000);
        conn.setReadTimeout(6000);
        conn.setRequestProperty("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)");

        BufferedReader reader = new BufferedReader(new InputStreamReader(conn.getInputStream()));
        StringBuilder html = new StringBuilder();
        String line;
        while ((line = reader.readLine()) != null) {
            html.append(line);
        }
        reader.close();
        conn.disconnect();

        Pattern pattern = Pattern.compile("const\\s+token\\s*=\\s*['\"]([^'\"]+)['\"]");
        Matcher matcher = pattern.matcher(html.toString());
        if (matcher.find()) {
            sCachedToken = matcher.group(1);
            sTokenExpiry = now + 40 * 60 * 1000;
            return sCachedToken;
        }

        if (sCachedToken != null) return sCachedToken;
        throw new Exception("Token extraction failed");
    }

    private static String fetchArrivals(String stopCode, String token) throws Exception {
        URL url = new URL(BASE_API_URL + stopCode);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod("GET");
        conn.setConnectTimeout(6000);
        conn.setReadTimeout(6000);
        conn.setRequestProperty("Authorization", "Bearer " + token);
        conn.setRequestProperty("Origin", "https://ioannina.citybus.gr");
        conn.setRequestProperty("Referer", "https://ioannina.citybus.gr/");
        conn.setRequestProperty("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)");

        BufferedReader reader = new BufferedReader(new InputStreamReader(conn.getInputStream()));
        StringBuilder response = new StringBuilder();
        String line;
        while ((line = reader.readLine()) != null) {
            response.append(line);
        }
        reader.close();
        conn.disconnect();

        return response.toString();
    }
}
