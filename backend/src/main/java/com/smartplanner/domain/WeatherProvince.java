package com.smartplanner.domain;

/**
 * Province-level weather locations. Coordinates point at the provincial capital
 * (or the main urban centre for municipalities and special regions), while the
 * forecast is labelled with the province name shown to the user.
 */
public enum WeatherProvince {
    BEIJING("北京", 39.9042, 116.4074, "Asia/Shanghai"),
    TIANJIN("天津", 39.0842, 117.2009, "Asia/Shanghai"),
    HEBEI("河北", 38.0428, 114.5149, "Asia/Shanghai"),
    SHANXI("山西", 37.8706, 112.5489, "Asia/Shanghai"),
    INNER_MONGOLIA("内蒙古", 40.8424, 111.7490, "Asia/Shanghai"),
    LIAONING("辽宁", 41.8057, 123.4315, "Asia/Shanghai"),
    JILIN("吉林", 43.8171, 125.3235, "Asia/Shanghai"),
    HEILONGJIANG("黑龙江", 45.8038, 126.5349, "Asia/Shanghai"),
    SHANGHAI("上海", 31.2304, 121.4737, "Asia/Shanghai"),
    JIANGSU("江苏", 32.0603, 118.7969, "Asia/Shanghai"),
    ZHEJIANG("浙江", 30.2741, 120.1551, "Asia/Shanghai"),
    ANHUI("安徽", 31.8206, 117.2272, "Asia/Shanghai"),
    FUJIAN("福建", 26.0745, 119.2965, "Asia/Shanghai"),
    JIANGXI("江西", 28.6820, 115.8579, "Asia/Shanghai"),
    SHANDONG("山东", 36.6512, 117.1201, "Asia/Shanghai"),
    HENAN("河南", 34.7466, 113.6254, "Asia/Shanghai"),
    HUBEI("湖北", 30.5928, 114.3055, "Asia/Shanghai"),
    HUNAN("湖南", 28.2282, 112.9388, "Asia/Shanghai"),
    GUANGDONG("广东", 23.1291, 113.2644, "Asia/Shanghai"),
    GUANGXI("广西", 22.8170, 108.3665, "Asia/Shanghai"),
    HAINAN("海南", 20.0440, 110.1999, "Asia/Shanghai"),
    CHONGQING("重庆", 29.5630, 106.5516, "Asia/Shanghai"),
    SICHUAN("四川", 30.5728, 104.0668, "Asia/Shanghai"),
    GUIZHOU("贵州", 26.6470, 106.6302, "Asia/Shanghai"),
    YUNNAN("云南", 25.0389, 102.7183, "Asia/Shanghai"),
    TIBET("西藏", 29.6520, 91.1721, "Asia/Shanghai"),
    SHAANXI("陕西", 34.3416, 108.9398, "Asia/Shanghai"),
    GANSU("甘肃", 36.0611, 103.8343, "Asia/Shanghai"),
    QINGHAI("青海", 36.6171, 101.7782, "Asia/Shanghai"),
    NINGXIA("宁夏", 38.4872, 106.2309, "Asia/Shanghai"),
    XINJIANG("新疆", 43.8256, 87.6168, "Asia/Shanghai"),
    TAIWAN("台湾", 25.0330, 121.5654, "Asia/Taipei"),
    HONG_KONG("香港", 22.3193, 114.1694, "Asia/Hong_Kong"),
    MACAU("澳门", 22.1987, 113.5439, "Asia/Macau");

    private final String label;
    private final double latitude;
    private final double longitude;
    private final String timezone;

    WeatherProvince(String label, double latitude, double longitude, String timezone) {
        this.label = label;
        this.latitude = latitude;
        this.longitude = longitude;
        this.timezone = timezone;
    }

    public String label() {
        return label;
    }

    public double latitude() {
        return latitude;
    }

    public double longitude() {
        return longitude;
    }

    public String timezone() {
        return timezone;
    }
}
