using AIVisibility.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AIVisibility.Infrastructure.Data.Configurations;

public class AIPlatformConfiguration : IEntityTypeConfiguration<AIPlatform>
{
    public void Configure(EntityTypeBuilder<AIPlatform> builder)
    {
        builder.ToTable("ai_platforms");
        builder.HasKey(p => p.Id);
        builder.Property(p => p.Id).HasColumnName("id");
        builder.Property(p => p.Code).HasColumnName("code").HasMaxLength(50).IsRequired();
        builder.Property(p => p.Name).HasColumnName("name").HasMaxLength(100).IsRequired();
        builder.Property(p => p.DisplayOrder).HasColumnName("display_order");
        builder.Property(p => p.IsDefaultSelected).HasColumnName("is_default_selected");
        builder.HasIndex(p => p.Code).IsUnique();

        // v1 platforms (ADR-002 §11). Fixed GUIDs so the seed is stable across environments.
        // Default-selected: ChatGPT, Gemini, Claude. Others are opt-in.
        builder.HasData(
            Platform("a0000000-0000-0000-0000-000000000001", "ChatGpt", "ChatGPT", 1, true),
            Platform("a0000000-0000-0000-0000-000000000002", "ChatGptSearch", "ChatGPT Search", 2, false),
            Platform("a0000000-0000-0000-0000-000000000003", "Gemini", "Gemini", 3, true),
            Platform("a0000000-0000-0000-0000-000000000004", "Claude", "Claude", 4, true),
            Platform("a0000000-0000-0000-0000-000000000005", "Grok", "Grok", 5, false),
            Platform("a0000000-0000-0000-0000-000000000006", "Perplexity", "Perplexity", 6, false),
            Platform("a0000000-0000-0000-0000-000000000007", "Copilot", "Copilot", 7, false)
        );
    }

    private static AIPlatform Platform(string id, string code, string name, int order, bool defaultSelected) =>
        new()
        {
            Id = new Guid(id),
            Code = code,
            Name = name,
            DisplayOrder = order,
            IsDefaultSelected = defaultSelected,
        };
}
