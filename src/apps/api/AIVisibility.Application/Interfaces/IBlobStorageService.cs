namespace AIVisibility.Application.Interfaces;

public interface IBlobStorageService
{
    Task<string> UploadTextAsync(string containerName, string blobName, string content, CancellationToken cancellationToken = default);
    Task<string> DownloadTextAsync(string containerName, string blobName, CancellationToken cancellationToken = default);
}
