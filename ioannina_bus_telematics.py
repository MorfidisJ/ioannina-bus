#!/usr/bin/env python3
"""
Astiko KTEL Ioannina - Real-time Bus Telematics API Client
Description: Standalone client to fetch live bus locations, arrivals, and schedules
             from CityBus Ioannina (Agency 106) for use in any Python project.
"""

import re
import sys
import json
import time
import urllib.request
import urllib.error
from typing import Dict, Any, List, Optional

# Constants
BASE_WEB_URL = "https://ioannina.citybus.gr/el/stops"
BASE_API_URL = "https://rest.citybus.gr/api/v1"
AGENCY_ID = 106  # Ioannina Urban Transit (Αστικό ΚΤΕΛ Ιωαννίνων)

# Key Stop Codes for University of Ioannina & City Center
STOPS = {
    "930": "Φιλοσοφική προς Κέντρο / Philosophy School (Closest to Refectory -> City Center)",
    "400": "Δικαστικό Μέγαρο / Court House (City Center -> Campus)",
    "447": "Πύλη Πανεπιστημίου / Campus Main Gate (Campus -> City Center)",
    "451": "Πανεπιστημιακό Νοσοκομείο / University Hospital",
    "201": "Πλάτανος / Platanos (City Center)",
    "202": "Ρολόι / Clock Tower (City Center)",
}

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    ),
    "Origin": "https://ioannina.citybus.gr",
    "Referer": "https://ioannina.citybus.gr/",
    "Accept": "application/json, text/plain, */*",
}


class IoanninaBusTelematics:
    def __init__(self, cache_token_minutes: int = 40):
        self.token: Optional[str] = None
        self.token_expiry: float = 0.0
        self.cache_duration = cache_token_minutes * 60

    def get_token(self, force_refresh: bool = False) -> str:
        """
        Extracts the active Bearer JWT token dynamically from the official stops page.
        Tokens rotate periodically, so we cache them in memory.
        """
        now = time.time()
        if self.token and not force_refresh and now < self.token_expiry:
            return self.token

        req = urllib.request.Request(BASE_WEB_URL, headers={"User-Agent": HEADERS["User-Agent"]})
        try:
            with urllib.request.urlopen(req, timeout=12) as response:
                html = response.read().decode("utf-8")
        except Exception as e:
            if self.token:
                return self.token
            raise RuntimeError(f"Failed to fetch CityBus Ioannina token page: {e}")

        # Extract const token = '...'
        match = re.search(r"const\s+token\s*=\s*['\"]([^'\"]+)['\"]", html)
        if not match:
            raise RuntimeError("Could not find JWT Bearer token in CityBus Ioannina HTML.")

        self.token = match.group(1)
        self.token_expiry = now + self.cache_duration
        return self.token

    def _api_get(self, endpoint: str, lang: str = "el") -> Any:
        token = self.get_token()
        url = f"{BASE_API_URL}/{lang}/{AGENCY_ID}/{endpoint.lstrip('/')}"

        headers = dict(HEADERS)
        headers["Authorization"] = f"Bearer {token}"
        req = urllib.request.Request(url, headers=headers)

        try:
            with urllib.request.urlopen(req, timeout=10) as response:
                return json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            if e.code == 404:
                # Normal 404: No active vehicles transmitting within the 30-min window
                return None
            if e.code == 401:
                # Token expired: invalidate cache and retry once
                token = self.get_token(force_refresh=True)
                headers["Authorization"] = f"Bearer {token}"
                req = urllib.request.Request(url, headers=headers)
                with urllib.request.urlopen(req, timeout=10) as response:
                    return json.loads(response.read().decode("utf-8"))
            raise

    def get_live_stop(self, stop_code: str, lang: str = "el") -> Dict[str, Any]:
        """
        Fetches live vehicle arrivals within the next 30 minutes for a given stop.
        Returns empty list if off-peak or no vehicles currently transmitting.
        """
        data = self._api_get(f"stops/live/{stop_code}", lang=lang)
        if not data or not isinstance(data, dict):
            return {
                "stopCode": str(stop_code),
                "isLive": False,
                "vehicles": []
            }

        vehicles = data.get("vehicles", [])
        results = []
        for v in vehicles:
            departure_mins = v.get("departureMins", 0)
            departure_secs = v.get("departureSeconds", 0)
            mins = 0 if (departure_mins == 0 and departure_secs <= 30) else (departure_mins + 1)

            results.append({
                "line": v.get("lineCode", ""),
                "lineName": v.get("lineName", ""),
                "routeName": v.get("routeName", ""),
                "minutesUntil": mins,
                "departureSeconds": departure_secs,
                "vehicleCode": v.get("vehicleCode", ""),
                "latitude": v.get("latitude"),
                "longitude": v.get("longitude")
            })

        return {
            "stopCode": str(stop_code),
            "isLive": len(results) > 0,
            "vehicles": results
        }

    def get_stop_schedule(self, stop_code: str, day_type: int = 1, lang: str = "el") -> List[Dict[str, Any]]:
        """
        Fetches official scheduled departures for a stop.
        day_type: 1 = Weekday (Καθημερινή), 2 = Saturday (Σάββατο), 3 = Sunday (Κυριακή)
        """
        data = self._api_get(f"trips/stop/{stop_code}/day/{day_type}", lang=lang)
        if not isinstance(data, list):
            return []
        
        # Normalize departure time for convenience
        for item in data:
            if "tripTime" in item and "departureTime" not in item:
                item["departureTime"] = item["tripTime"]
        return data

    def get_all_lines(self, lang: str = "el") -> List[Dict[str, Any]]:
        """Fetches all transit lines in Ioannina."""
        data = self._api_get("lines", lang=lang)
        return data if isinstance(data, list) else []

    def get_all_stops(self, lang: str = "el") -> List[Dict[str, Any]]:
        """Fetches all stop definitions and coordinates."""
        data = self._api_get("stops", lang=lang)
        return data if isinstance(data, list) else []

    def get_route_sequence(self, route_code: str, lang: str = "el") -> List[Dict[str, Any]]:
        """Fetches the ordered stop sequence and coordinates for a given route."""
        data = self._api_get(f"routes/{route_code}/sequence", lang=lang)
        return data if isinstance(data, list) else []


# CLI Demonstration
if __name__ == "__main__":
    client = IoanninaBusTelematics()
    stop = sys.argv[1] if len(sys.argv) > 1 else "930"
    stop_desc = STOPS.get(stop, f"Stop #{stop}")

    print("==================================================")
    print("  Astiko KTEL Ioannina - Live Telematics Monitor  ")
    print("==================================================")
    print(f"Target: {stop_desc}")
    print("Fetching active token from ioannina.citybus.gr...")

    try:
        token = client.get_token()
        print(f"Token acquired! [Length: {len(token)} chars]")
        print(f"Querying real-time arrivals for stop {stop}...")

        live = client.get_live_stop(stop, lang="el")
        if live["isLive"]:
            print(f"\n[LIVE] Found {len(live['vehicles'])} vehicles approaching:")
            for v in live["vehicles"]:
                mins = f"{v['minutesUntil']} λεπτά" if v['minutesUntil'] > 0 else "Φτάνει τώρα!"
                print(f"  * Γραμμή {v['line']:>3} -> {v['routeName']} | Άφιξη: {mins:<12} (Όχημα #{v['vehicleCode']})")
        else:
            print(f"\n[STANDBY] No active vehicles broadcasting within 30 min window (normal at night/off-peak).")
            print("Querying scheduled timetable fallback...")
            schedule = client.get_stop_schedule(stop, day_type=1)
            print(f"Total scheduled trips today: {len(schedule)}")
            print("Upcoming departures preview:")
            for s in schedule[:8]:
                dep_time = s.get("tripTime") or s.get("departureTime", "-")
                print(f"  * {dep_time} | Γραμμή {s.get('lineCode', '-'):>2} -> {s.get('routeName', '-')}")

    except Exception as e:
        print(f"\nError: {e}")

