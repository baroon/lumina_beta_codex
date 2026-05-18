namespace AIVisibility.Api.DTOs;

public record ConfirmDiscoveryRequest(
    List<Guid> ConfirmedIds,
    List<Guid> DismissedIds);
