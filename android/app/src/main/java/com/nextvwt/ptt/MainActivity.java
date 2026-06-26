package com.nextvwt.ptt;

import android.os.Bundle;
import android.view.WindowManager;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.JSObject;

import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import java.security.MessageDigest;

import android.Manifest;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Block screenshot & screen recording (anti-cloning / data protection)
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_SECURE,
            WindowManager.LayoutParams.FLAG_SECURE
        );
        
        // Request Microphone permission natively so Capacitor WebView can use WebRTC getUserMedia
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.RECORD_AUDIO}, 1);
        }

        registerPlugin(AppSecurityPlugin.class);
        registerPlugin(BackgroundSurvivalPlugin.class);
    }
}

@CapacitorPlugin(name = "AppSecurity")
class AppSecurityPlugin extends Plugin {
    @PluginMethod
    public void getSigningCertificate(PluginCall call) {
        try {
            PackageManager pm = getContext().getPackageManager();
            String packageName = getContext().getPackageName();
            PackageInfo packageInfo = pm.getPackageInfo(packageName, PackageManager.GET_SIGNATURES);
            Signature[] signatures = packageInfo.signatures;
            byte[] cert = signatures[0].toByteArray();
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] publicKey = md.digest(cert);
            
            StringBuilder hexString = new StringBuilder();
            for (int i = 0; i < publicKey.length; i++) {
                String appendString = Integer.toHexString(0xFF & publicKey[i]);
                if (appendString.length() == 1) hexString.append("0");
                hexString.append(appendString.toUpperCase());
                if (i < publicKey.length - 1) hexString.append(":");
            }
            
            JSObject ret = new JSObject();
            ret.put("value", hexString.toString());
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to get signing certificate", e);
        }
    }
}
