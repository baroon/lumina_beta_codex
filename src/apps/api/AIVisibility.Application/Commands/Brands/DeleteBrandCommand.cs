using MediatR;

namespace AIVisibility.Application.Commands.Brands;

/// <summary>
/// Hard-deletes a brand and the entire subtree below it: every tracker
/// (which cascades into scans / runs / answers / mentions / citations
/// / signals / prompts / junctions), every brand-level dimension row
/// (products, audiences, markets, topics, competitors, trust signals),
/// the BrandProfile, every DiscoveryRun + CrawledPage, and any
/// BrandSourceClassification rows. Workspace-shared Source rows survive.
///
/// Per the memory rule "data integrity over compat shims" +
/// "no legacy framing pre-release" — no soft-delete column.
/// </summary>
public record DeleteBrandCommand(Guid BrandId) : IRequest;
