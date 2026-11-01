package com.getcapacitor;
/** Stummel (Signaturen wie @capacitor/android 6.2.1). */
public class JSObject extends org.json.JSONObject {
  public JSObject() {}
  public JSObject(String json) throws org.json.JSONException {}
  public JSObject put(String k, boolean v) { return this; }
  public JSObject put(String k, int v) { return this; }
  public JSObject put(String k, long v) { return this; }
  public JSObject put(String k, double v) { return this; }
  public JSObject put(String k, Object v) { return this; }
  public JSObject put(String k, String v) { return this; }
  public String getString(String k, String d) { return null; }
  public Integer getInteger(String k, Integer d) { return null; }
  public Boolean getBoolean(String k, Boolean d) { return null; }
  public JSObject getJSObject(String n) { return null; }
}
