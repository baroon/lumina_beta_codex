namespace AIVisibility.Api.DTOs;

public record AddCustomPromptRequest(string Text, Guid VisibilityCheckId, Guid? PrimaryTopicId);
