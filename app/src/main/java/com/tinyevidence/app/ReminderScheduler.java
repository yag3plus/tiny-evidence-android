package com.tinyevidence.app;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;

import org.json.JSONObject;

import java.util.Calendar;

public final class ReminderScheduler {
    private static final String PREFS = "reminder_settings";
    private static final String MORNING_TIME = "morning_time";
    private static final String EVENING_TIME = "evening_time";
    private static final String MORNING_ENABLED = "morning_enabled";
    private static final String EVENING_ENABLED = "evening_enabled";

    private ReminderScheduler() {}

    public static void saveSettings(Context context, JSONObject obj) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
                .putString(MORNING_TIME, obj.optString("morningTime", "07:30"))
                .putString(EVENING_TIME, obj.optString("eveningTime", "23:30"))
                .putBoolean(MORNING_ENABLED, obj.optBoolean("morningEnabled", false))
                .putBoolean(EVENING_ENABLED, obj.optBoolean("eveningEnabled", false))
                .apply();
    }

    public static String getSettingsJson(Context context) {
        SharedPreferences p = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        JSONObject obj = new JSONObject();
        try {
            obj.put("morningTime", p.getString(MORNING_TIME, "07:30"));
            obj.put("eveningTime", p.getString(EVENING_TIME, "23:30"));
            obj.put("morningEnabled", p.getBoolean(MORNING_ENABLED, false));
            obj.put("eveningEnabled", p.getBoolean(EVENING_ENABLED, false));
        } catch (Exception ignored) {}
        return obj.toString();
    }

    public static void scheduleAll(Context context) {
        SharedPreferences p = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        scheduleType(context, "morning", p.getBoolean(MORNING_ENABLED, false), p.getString(MORNING_TIME, "07:30"));
        scheduleType(context, "evening", p.getBoolean(EVENING_ENABLED, false), p.getString(EVENING_TIME, "23:30"));
    }

    public static void scheduleNext(Context context, String type) {
        SharedPreferences p = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        boolean enabled = "morning".equals(type) ? p.getBoolean(MORNING_ENABLED, false) : p.getBoolean(EVENING_ENABLED, false);
        String time = "morning".equals(type) ? p.getString(MORNING_TIME, "07:30") : p.getString(EVENING_TIME, "23:30");
        scheduleType(context, type, enabled, time);
    }

    private static void scheduleType(Context context, String type, boolean enabled, String time) {
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        PendingIntent pendingIntent = alarmPendingIntent(context, type);
        alarmManager.cancel(pendingIntent);
        if (!enabled) return;

        String[] parts = time.split(":");
        int hour = parts.length > 0 ? Integer.parseInt(parts[0]) : 7;
        int minute = parts.length > 1 ? Integer.parseInt(parts[1]) : 30;
        Calendar next = Calendar.getInstance();
        next.set(Calendar.HOUR_OF_DAY, hour);
        next.set(Calendar.MINUTE, minute);
        next.set(Calendar.SECOND, 0);
        next.set(Calendar.MILLISECOND, 0);
        if (next.getTimeInMillis() <= System.currentTimeMillis()) next.add(Calendar.DAY_OF_YEAR, 1);
        alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, next.getTimeInMillis(), pendingIntent);
    }

    private static PendingIntent alarmPendingIntent(Context context, String type) {
        Intent intent = new Intent(context, ReminderReceiver.class);
        intent.setAction("com.tinyevidence.app.REMINDER_" + type.toUpperCase());
        intent.putExtra("type", type);
        int requestCode = "morning".equals(type) ? 2001 : 2002;
        return PendingIntent.getBroadcast(context, requestCode, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
}
