using AIVisibility.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AIVisibility.Infrastructure.Data.Configurations;

public class AudienceConfiguration : IEntityTypeConfiguration<Audience>
{
    public void Configure(EntityTypeBuilder<Audience> builder)
    {
        builder.ToTable("audiences");
        builder.HasKey(a => a.Id);
        builder.Property(a => a.Id).HasColumnName("id");
        builder.Property(a => a.BrandId).HasColumnName("brand_id");
        builder.Property(a => a.Name).HasColumnName("name").HasMaxLength(300).IsRequired();
        builder.Property(a => a.Description).HasColumnName("description").HasMaxLength(2000);
        builder.Property(a => a.Confidence).HasColumnName("confidence");
        builder.Property(a => a.Source).HasColumnName("source").HasConversion<string>().HasMaxLength(50);
        builder.Property(a => a.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(50);

        builder.HasIndex(a => a.BrandId);
    }
}
