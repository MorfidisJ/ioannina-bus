package gr.uoi.ioanninabus;

import android.content.Context;
import android.content.SharedPreferences;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "WidgetBridge")
public class WidgetBridgePlugin extends Plugin {

    @PluginMethod
    public void setWidgetStop(PluginCall call) {
        String stopCode = call.getString("stopCode");
        String stopName = call.getString("stopName");

        if (stopCode == null || stopCode.isEmpty()) {
            call.reject("Must provide stopCode");
            return;
        }

        if (stopName == null) {
            stopName = "Στάση #" + stopCode;
        }

        Context context = getContext();
        SharedPreferences prefs = context.getSharedPreferences(BusArrivalWidget.PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit()
                .putString(BusArrivalWidget.KEY_STOP_CODE, stopCode)
                .putString(BusArrivalWidget.KEY_STOP_NAME, stopName)
                .apply();

        // Immediately refresh all active home screen widgets with the new stop
        BusArrivalWidget.updateAllWidgets(context);

        JSObject ret = new JSObject();
        ret.put("success", true);
        ret.put("stopCode", stopCode);
        ret.put("stopName", stopName);
        call.resolve(ret);
    }

    @PluginMethod
    public void getWidgetStop(PluginCall call) {
        Context context = getContext();
        SharedPreferences prefs = context.getSharedPreferences(BusArrivalWidget.PREFS_NAME, Context.MODE_PRIVATE);
        String stopCode = prefs.getString(BusArrivalWidget.KEY_STOP_CODE, "930");
        String stopName = prefs.getString(BusArrivalWidget.KEY_STOP_NAME, "Φιλοσοφική (#930)");

        JSObject ret = new JSObject();
        ret.put("stopCode", stopCode);
        ret.put("stopName", stopName);
        call.resolve(ret);
    }
}
