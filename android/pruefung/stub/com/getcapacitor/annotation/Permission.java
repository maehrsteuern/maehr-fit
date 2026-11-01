package com.getcapacitor.annotation;
@java.lang.annotation.Retention(java.lang.annotation.RetentionPolicy.RUNTIME)
public @interface Permission { String[] strings() default {}; String alias() default ""; }
