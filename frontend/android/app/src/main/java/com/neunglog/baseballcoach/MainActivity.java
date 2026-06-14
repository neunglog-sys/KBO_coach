package com.neunglog.baseballcoach;

import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.webkit.WebView;

import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Edge-to-edge 유지: 콘텐츠가 시스템 바 뒤까지 그려져 상단 상태바가 앱 배경에 녹아든다.
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        getWindow().setStatusBarColor(Color.TRANSPARENT);
        getWindow().setNavigationBarColor(Color.TRANSPARENT);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            // 투명 네비 바에 시스템이 자동으로 입히는 반투명 스크림 제거 → 배경이 끝까지 비침.
            getWindow().setNavigationBarContrastEnforced(false);
        }

        // 밝은 배경(하늘/흰 시트) 위에서 시스템 바 아이콘을 어둡게 → 잘 보이게.
        // onCreate에서 한 번만 걸면 일부 기기(삼성 등)에서 이후 시스템이 기본값으로 덮어
        // 네비 버튼이 흰색으로 보이는 문제가 있어, post + onResume/onWindowFocus에서 재적용한다.
        applyLightSystemBars();
        getWindow().getDecorView().post(this::applyLightSystemBars);

        // 갤럭시 하단 네비 바(버튼/제스처) 높이를 실시간으로 읽어 CSS 변수(--sab)로 주입.
        // 하단 고정 UI가 max(env(...), var(--sab))로 이 값을 받아 바 위로 자연스럽게 올라온다.
        // (제스처 ↔ 버튼 모드 전환 시에도 리스너가 다시 호출돼 반응형으로 갱신됨)
        final WebView webView = this.bridge.getWebView();
        ViewCompat.setOnApplyWindowInsetsListener(webView, (v, insets) -> {
            Insets navBar = insets.getInsets(WindowInsetsCompat.Type.navigationBars());
            Insets statusBar = insets.getInsets(WindowInsetsCompat.Type.statusBars());
            float density = getResources().getDisplayMetrics().density;
            final int bottomDp = Math.round(navBar.bottom / density);
            final int topDp = Math.round(statusBar.top / density);
            v.post(() -> webView.evaluateJavascript(
                    "document.documentElement.style.setProperty('--sab','" + bottomDp + "px');" +
                    "document.documentElement.style.setProperty('--sat','" + topDp + "px');",
                    null));
            return insets;
        });
        ViewCompat.requestApplyInsets(webView);
    }

    /** 상태바/네비바 아이콘을 어둡게(밝은 배경용). 시스템이 덮을 수 있어 여러 시점에 재적용. */
    private void applyLightSystemBars() {
        WindowInsetsControllerCompat controller =
                WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        controller.setAppearanceLightStatusBars(true);
        controller.setAppearanceLightNavigationBars(true);
    }

    @Override
    public void onResume() {
        super.onResume();
        applyLightSystemBars();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            applyLightSystemBars();
        }
    }
}
