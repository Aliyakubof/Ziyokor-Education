package com.ziyokor.education;

import android.app.AppOpsManager;
import android.app.usage.UsageStats;
import android.app.usage.UsageStatsManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.os.Build;
import android.provider.Settings;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.Arrays;
import java.util.Calendar;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@CapacitorPlugin(name = "UsageStats")
public class UsageStatsPlugin extends Plugin {

    // Таълим ва мулоқот учун иловалар рўйхати (пакет номлари)
    private static final List<String> EDUCATION_APPS = Arrays.asList(
        "com.duolingo", 
        "org.telegram.messenger", 
        "com.whatsapp", 
        "com.google.android.apps.classroom",
        "com.ziyokor.education"
    );

    @PluginMethod
    public void checkPermissions(PluginCall call) {
        boolean granted = false;
        Context context = getContext();
        AppOpsManager appOps = (AppOpsManager) context.getSystemService(Context.APP_OPS_SERVICE);
        int mode = appOps.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, 
            android.os.Process.myUid(), context.getPackageName());

        if (mode == AppOpsManager.MODE_DEFAULT) {
            granted = (context.checkCallingOrSelfPermission(android.Manifest.permission.PACKAGE_USAGE_STATS) == PackageManager.PERMISSION_GRANTED);
        } else {
            granted = (mode == AppOpsManager.MODE_ALLOWED);
        }

        JSObject ret = new JSObject();
        ret.put("granted", granted);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestPermissions(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve();
    }

    @PluginMethod
    public void getUsageData(PluginCall call) {
        Context context = getContext();
        UsageStatsManager usageStatsManager = (UsageStatsManager) context.getSystemService(Context.USAGE_STATS_SERVICE);
        PackageManager pm = context.getPackageManager();

        Calendar cal = Calendar.getInstance();
        cal.set(Calendar.HOUR_OF_DAY, 0);
        cal.set(Calendar.MINUTE, 0);
        cal.set(Calendar.SECOND, 0);
        long start = cal.getTimeInMillis();
        long end = System.currentTimeMillis();

        List<UsageStats> queryUsageStats = usageStatsManager.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, start, end);

        if (queryUsageStats == null || queryUsageStats.isEmpty()) {
            call.reject("Usage stats not available or permission denied.");
            return;
        }

        Map<String, Long> appUsageMap = new HashMap<>();
        for (UsageStats stats : queryUsageStats) {
            String pkg = stats.getPackageName();
            long time = stats.getTotalTimeInForeground();
            if (time > 0) {
                appUsageMap.put(pkg, appUsageMap.getOrDefault(pkg, 0L) + time);
            }
        }

        JSArray educationAppData = new JSArray();
        long totalZiyokorTime = appUsageMap.getOrDefault("com.ziyokor.education", 0L);

        for (String pkg : EDUCATION_APPS) {
            if (appUsageMap.containsKey(pkg)) {
                try {
                    ApplicationInfo appInfo = pm.getApplicationInfo(pkg, 0);
                    String appName = (String) pm.getApplicationLabel(appInfo);
                    
                    JSObject appObj = new JSObject();
                    appObj.put("name", appName);
                    appObj.put("packageName", pkg);
                    appObj.put("timeMs", appUsageMap.get(pkg));
                    educationAppData.put(appObj);
                } catch (PackageManager.NameNotFoundException e) {
                    // Илова ўрнатилмаган бўлса ўтказиб юборамиз
                }
            }
        }

        JSObject result = new JSObject();
        result.put("ziyokorTimeMs", totalZiyokorTime);
        result.put("educationApps", educationAppData);
        
        call.resolve(result);
    }
}
