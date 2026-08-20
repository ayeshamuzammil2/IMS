using FluentAssertions;
using PIA.Domain.Enums;
using PIA.Domain.Services;
using Xunit;

namespace PIA.Tests.Domain;

public sealed class GeoCalculatorTests
{
    // ERP Department coordinates used throughout the seed data (Karachi).
    private const double DeptLat = 24.8967;
    private const double DeptLng = 67.1608;

    [Fact]
    public void DistanceInMeters_SameCoordinate_IsZero()
    {
        GeoCalculator.DistanceInMeters(DeptLat, DeptLng, DeptLat, DeptLng).Should().BeApproximately(0, 0.01);
    }

    [Fact]
    public void DistanceInMeters_OneDegreeLatitude_IsApproximatelyEarthCircumferenceOver360()
    {
        // 1 degree of latitude is ~111.32km everywhere on Earth, unlike longitude which shrinks toward the poles.
        var distance = GeoCalculator.DistanceInMeters(0, 0, 1, 0);
        distance.Should().BeApproximately(111_320, 200);
    }

    [Theory]
    [InlineData(50, 5, 150)] // well within radius even accounting for accuracy
    [InlineData(140, 5, 150)] // distance + accuracy still fits inside radius
    public void Classify_WithinRadius_IsInside(double distanceM, double accuracyM, double radiusM)
    {
        GeoCalculator.Classify(distanceM, accuracyM, radiusM).Should().Be(GeofenceState.Inside);
    }

    [Fact]
    public void Classify_DistanceUnderRadius_ButAccuracyPushesOverTotal_WithGoodAccuracy_IsStillInside()
    {
        // distance (140) is under radius (150), accuracy (30) is <=50 - the "good GPS fix" carve-out applies
        // even though distance+accuracy (170) exceeds the radius.
        GeoCalculator.Classify(140, 30, 150).Should().Be(GeofenceState.Inside);
    }

    [Fact]
    public void Classify_DistanceUnderRadius_PoorAccuracy_IsUncertain()
    {
        // distance (140) under radius (150), but accuracy (80) is too poor for the good-fix carve-out,
        // and distance+accuracy (220) exceeds the radius - lands in the uncertain band.
        GeoCalculator.Classify(140, 80, 150).Should().Be(GeofenceState.Uncertain);
    }

    [Fact]
    public void Classify_FarOutside_IsOutside()
    {
        GeoCalculator.Classify(500, 10, 150).Should().Be(GeofenceState.Outside);
    }

    [Fact]
    public void Classify_UncertainBandButAccuracyExceedsCap_IsOutside()
    {
        // distance+accuracy (150+150=300) exceeds radius (150) by exactly accuracy - would normally be
        // "uncertain" but accuracy (150) exceeds the uncertainMaxAccuracyM cap (100), so it's Outside.
        GeoCalculator.Classify(150, 150, 150, uncertainMaxAccuracyM: 100).Should().Be(GeofenceState.Outside);
    }
}
