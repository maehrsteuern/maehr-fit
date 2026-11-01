package com.getcapacitor;
/** Stummel für die Kotlin-Prüfung (android/pruefung/kotlin_pruefen.sh): Signaturen wie @capacitor/android 6.2.1, ohne Inhalt. */
public class Plugin {
  protected Bridge bridge;
  public void load() {}
  public android.content.Context getContext() { return null; }
  public android.app.Activity getActivity() { return null; }
  public Bridge getBridge() { return bridge; }
  public void startActivityForResult(PluginCall c, android.content.Intent i, String n) {}
  public PermissionState getPermissionState(String alias) { return null; }
  protected void requestPermissionForAlias(String alias, PluginCall call, String callbackName) {}
  protected void notifyListeners(String eventName, JSObject data, boolean retainUntilConsumed) {}
  protected void notifyListeners(String eventName, JSObject data) {}
  protected void handleOnNewIntent(android.content.Intent intent) {}
  protected void handleOnResume() {}
  protected void handleOnPause() {}
  protected void handleOnDestroy() {}
}
