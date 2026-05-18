namespace AIVisibility.Domain.Enums;

public enum DiscoveryStatus
{
    Pending,
    Crawling,
    Extracting,
    AwaitingConfirmation,
    Completed,
    Failed
}
