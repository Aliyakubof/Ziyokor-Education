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

import java.util.Calendar;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@CapacitorPlugin(name = "UsageStats")
public class UsageStatsPlugin extends Plugin {

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
        cal.add(Calendar.DAY_OF_YEAR, -1);
        long start = cal.getTimeInMillis();
        long end = System.currentTimeMillis();

        List<UsageStats> queryUsageStats = usageStatsManager.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, start, end);

        if (queryUsageStats == null || queryUsageStats.isEmpty()) {
            call.reject("Usage stats not available or permission denied.");
            return;
        }

        // Aggregate by package
        Map<String, UsageStats> aggregatedStats = null;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
             aggregatedStats = queryUsageStats.stream().collect(
                    Collectors.toMap(UsageStats::getPackageName, stats -> stats, (stats1, stats2) -> {
                        stats1.add(stats2);
                        return stats1;
                    }));
             queryUsageStats = aggregatedStats.values().stream().collect(Collectors.toList());
        }


        queryUsageStats.sort((a, b) -> Long.compare(b.getTotalTimeInForeground(), a.getTotalTimeInForeground()));

        long totalScreenTimeMs = 0;
        JSArray topApps = new JSArray();

        int count = 0;
        for (UsageStats stats : queryUsageStats) {
            long timeMs = stats.getTotalTimeInForeground();
            if (timeMs > 0) {
                totalScreenTimeMs += timeMs;

                String packageName = stats.getPackageName();
                
                // Exclude system UI and launchers generally from being top offenders if desired
                if (packageName.contains("launcher") || packageName.equals("android") || packageName.contains("systemui")) continue;

                if (count < 5) {
                    try {
                        ApplicationInfo appInfo = pm.getApplicationInfo(packageName, 0);
                        String appName = (String) pm.getApplicationLabel(appInfo);
                        
                        JSObject appData = new JSObject();
                        appData.put("name", appName);
                        appData.put("packageName", packageName);
                        appData.put("timeMs", timeMs);
                        topApps.put(appData);
                        count++;
                    } catch (PackageManager.NameNotFoundException e) {
                        // Skip if name not found
                    }
                }
            }
        }

        JSObject result = new JSObject();
        result.put("totalScreenTimeMs", totalScreenTimeMs);
        result.put("topApps", topApps);
        
        call.resolve(result);
    }
}
