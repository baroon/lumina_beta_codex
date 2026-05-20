namespace AIVisibility.Api.DTOs;

public record RegenerateLensRequest(
    string Lens,
    string? Industry,
    string? Category,
    List<string> Products,
    List<string> Audiences,
    List<string> Markets);
