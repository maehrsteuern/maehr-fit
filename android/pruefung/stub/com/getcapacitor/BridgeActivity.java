package com.getcapacitor;
/** Stummel (Signaturen wie @capacitor/android 6.2.1; dort AppCompatActivity). */
public class BridgeActivity extends android.app.Activity {
  public void registerPlugin(Class<? extends Plugin> plugin) {}
  @Override protected void onCreate(android.os.Bundle savedInstanceState) { super.onCreate(savedInstanceState); }
}
