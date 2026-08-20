using PIA.Domain.Enums;

namespace PIA.Domain.Services;

public static class GeoCalculator
{
    private const double EarthRadiusM = 6371000;

    /// <summary>Haversine formula - distance between two GPS points in meters.</summary>
    public static double DistanceInMeters(double lat1, double lon1, double lat2, double lon2)
    {
        var dLat = ToRadians(lat2 - lat1);
        var dLon = ToRadians(lon2 - lon1);

        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                Math.Cos(ToRadians(lat1)) * Math.Cos(ToRadians(lat2)) *
                Math.Sin(dLon / 2) * Math.Sin(dLon / 2);

        var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        return EarthRadiusM * c;
    }

    /// <summary>
    /// Tri-state geofence classification per the attendance design: a hard "inside" when distance
    /// and GPS accuracy together fit inside the radius, an "uncertain" band that is allowed but
    /// flagged for mentor review, and "outside" otherwise.
    /// </summary>
    public static GeofenceState Classify(double distanceM, double accuracyM, double radiusM, double uncertainMaxAccuracyM = 100)
    {
        if (distanceM + accuracyM <= radiusM)
        {
            return GeofenceState.Inside;
        }

        if (distanceM <= radiusM && accuracyM <= 50)
        {
            return GeofenceState.Inside;
        }

        if (distanceM <= radiusM + accuracyM && accuracyM <= uncertainMaxAccuracyM)
        {
            return GeofenceState.Uncertain;
        }

        return GeofenceState.Outside;
    }

    private static double ToRadians(double deg) => deg * Math.PI / 180;
}
