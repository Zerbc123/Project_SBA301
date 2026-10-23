package com.tablemaster.auth.util;

public class PhoneNumberUtil {

    public static boolean isEmail(String identifier) {
        return identifier != null && identifier.contains("@");
    }

    public static String normalizePhoneNumber(String rawPhone) {
        if (rawPhone == null || rawPhone.isBlank()) {
            return rawPhone;
        }

        String cleaned = rawPhone.replaceAll("[^0-9+]", "");

        if (cleaned.startsWith("0")) {
            return "+84" + cleaned.substring(1);
        }

        if (cleaned.startsWith("84") && !cleaned.startsWith("+84")) {
            return "+" + cleaned;
        }

        if (!cleaned.startsWith("+") && cleaned.length() >= 9) {
            return "+84" + cleaned;
        }

        return cleaned;
    }
}
