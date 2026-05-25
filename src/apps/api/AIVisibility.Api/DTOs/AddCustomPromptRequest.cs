namespace AIVisibility.Api.DTOs;

public record AddCustomPromptRequest(string Text, Guid VisibilityLensId, Guid? PrimaryTopicId);
