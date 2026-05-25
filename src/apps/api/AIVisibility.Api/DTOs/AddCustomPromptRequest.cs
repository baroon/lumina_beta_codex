namespace AIVisibility.Api.DTOs;

public record AddCustomPromptRequest(string Text, Guid LensId, Guid? PrimaryTopicId);
