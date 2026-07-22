package com.tinyevidence.app;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;

public class ReminderReceiver extends BroadcastReceiver {
    private static final String CHANNEL_ID = "morning_evening_companion";

    @Override
    public void onReceive(Context context, Intent intent) {
        String type = intent.getStringExtra("type");
        if (type == null) type = "morning";
        createChannel(context);

        if (Build.VERSION.SDK_INT < 33 || context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) {
            Intent openIntent = new Intent(context, MainActivity.class);
            openIntent.putExtra("interaction", type);
            openIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            PendingIntent contentIntent = PendingIntent.getActivity(context, "morning".equals(type) ? 3001 : 3002, openIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

            String title = "morning".equals(type) ? "我起床了" : "我要睡觉了";
            String text = "morning".equals(type) ? "小团醒了。和它一起拉开窗帘吧。" : "小团准备休息了。帮它关灯并盖好毯子吧。";
            android.app.Notification notification = new android.app.Notification.Builder(context, CHANNEL_ID)
                    .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
                    .setContentTitle(title)
                    .setContentText(text)
                    .setAutoCancel(true)
                    .setContentIntent(contentIntent)
                    .build();
            ((NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE)).notify("morning".equals(type) ? 4001 : 4002, notification);
        }
        ReminderScheduler.scheduleNext(context, type);
    }

    private void createChannel(Context context) {
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "早晚陪伴", NotificationManager.IMPORTANCE_DEFAULT);
            channel.setDescription("发送早晨起床与晚间睡觉消息");
            ((NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE)).createNotificationChannel(channel);
        }
    }
}
