package com.getcapacitor.annotation;
@java.lang.annotation.Retention(java.lang.annotation.RetentionPolicy.RUNTIME)
public @interface CapacitorPlugin { String name() default ""; int[] requestCodes() default {}; Permission[] permissions() default {}; }
