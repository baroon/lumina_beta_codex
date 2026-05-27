using System.Reflection;
using AIVisibility.Application.Interfaces;
using FluentAssertions;
using Hangfire;

namespace AIVisibility.Tests.Unit.Application;

/// <summary>
/// Hangfire's filter pipeline reads <see cref="AutomaticRetryAttribute"/>
/// from the method that was enqueued. ScanExecutor enqueues via interface
/// types — <c>BackgroundJob.Enqueue&lt;ISignalExtractionJob&gt;(...)</c> —
/// so the attribute MUST live on the interface method, not the implementation.
/// An attribute on the impl is silently ignored and Hangfire falls back to its
/// default 10-retry budget, which materially changes the failure semantics
/// (Phase 3 plan D3 specifies 3 retries on extract, 1 on aggregate).
///
/// Caught 2026-05-27 verify-e2e: MetricAggregationJob's failed run logged
/// "Retry attempt 2 of 10" despite [AutomaticRetry(Attempts = 1)] on the
/// implementation method. The attribute was being ignored entirely.
/// </summary>
public class HangfireRetryAttributePresenceTests
{
    [Fact]
    public void SignalExtractionJob_InterfaceMethod_Carries_AutomaticRetry_With_Three_Attempts()
    {
        var method = typeof(ISignalExtractionJob).GetMethod(nameof(ISignalExtractionJob.ExtractAsync))!;
        var attr = method.GetCustomAttribute<AutomaticRetryAttribute>();

        attr.Should().NotBeNull(
            "Hangfire reads AutomaticRetry from the enqueued method, which is the interface method when ScanExecutor calls _jobs.Enqueue<ISignalExtractionJob>(...). An attribute on the impl is invisible.");
        attr!.Attempts.Should().Be(3, "Phase 3 plan D3: 3 retries on extract because LLM calls flake");
    }

    [Fact]
    public void MetricAggregationJob_InterfaceMethod_Carries_AutomaticRetry_With_One_Attempt()
    {
        var method = typeof(IMetricAggregationJob).GetMethod(nameof(IMetricAggregationJob.AggregateAsync))!;
        var attr = method.GetCustomAttribute<AutomaticRetryAttribute>();

        attr.Should().NotBeNull();
        attr!.Attempts.Should().Be(1,
            "Phase 3 plan D3: 1 retry on aggregate — it's deterministic SQL/math; if it fails twice the issue is code or data, not transient");
    }
}
