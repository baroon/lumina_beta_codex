using AIVisibility.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AIVisibility.Infrastructure.Data.Configurations;

public class CompetitorConfiguration : IEntityTypeConfiguration<Competitor>
{
    public void Configure(EntityTypeBuilder<Competitor> builder)
    {
        builder.ToTable("competitors");
        builder.HasKey(c => c.Id);
        builder.Property(c => c.Id).HasColumnName("id");
        builder.Property(c => c.BrandId).HasColumnName("brand_id");
        builder.Property(c => c.Name).HasColumnName("name").HasMaxLength(300).IsRequired();
        builder.Property(c => c.Domain).HasColumnName("domain").HasMaxLength(500);
        builder.Property(c => c.Description).HasColumnName("description").HasMaxLength(2000);
        builder.Property(c => c.Confidence).HasColumnName("confidence");
        builder.Property(c => c.Source).HasColumnName("source").HasConversion<string>().HasMaxLength(50);
        builder.Property(c => c.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(50);

        builder.HasIndex(c => c.BrandId);
    }
}
