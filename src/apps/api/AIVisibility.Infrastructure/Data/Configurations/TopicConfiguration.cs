using AIVisibility.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AIVisibility.Infrastructure.Data.Configurations;

public class TopicConfiguration : IEntityTypeConfiguration<Topic>
{
    public void Configure(EntityTypeBuilder<Topic> builder)
    {
        builder.ToTable("topics");
        builder.HasKey(t => t.Id);
        builder.Property(t => t.Id).HasColumnName("id");
        builder.Property(t => t.BrandId).HasColumnName("brand_id");
        builder.Property(t => t.Name).HasColumnName("name").HasMaxLength(300).IsRequired();
        builder.Property(t => t.Description).HasColumnName("description").HasMaxLength(2000);
        builder.Property(t => t.AliasesJson).HasColumnName("aliases").HasColumnType("jsonb");
        builder.Property(t => t.Confidence).HasColumnName("confidence");
        builder.Property(t => t.Source).HasColumnName("source").HasConversion<string>().HasMaxLength(50);
        builder.Property(t => t.DiscoveryRunId).HasColumnName("discovery_run_id");

        builder.HasIndex(t => t.BrandId);
    }
}
