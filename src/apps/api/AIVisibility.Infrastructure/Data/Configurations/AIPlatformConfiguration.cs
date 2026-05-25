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
        builder.HasIndex(p => p.Code).IsUnique();

        // v1 platforms (ADR-002 §11). Fixed GUIDs so the seed is stable across environments.
        builder.HasData(
            new AIPlatform
            {
                Id = new Guid("a0000000-0000-0000-0000-000000000001"),
                Code = "ChatGpt",
                Name = "ChatGPT",
                DisplayOrder = 1,
            },
            new AIPlatform
            {
                Id = new Guid("a0000000-0000-0000-0000-000000000002"),
                Code = "ChatGptSearch",
                Name = "ChatGPT Search",
                DisplayOrder = 2,
            },
            new AIPlatform
            {
                Id = new Guid("a0000000-0000-0000-0000-000000000003"),
                Code = "Gemini",
                Name = "Gemini",
                DisplayOrder = 3,
            },
            new AIPlatform
            {
                Id = new Guid("a0000000-0000-0000-0000-000000000004"),
                Code = "Claude",
                Name = "Claude",
                DisplayOrder = 4,
            }
        );
    }
}
