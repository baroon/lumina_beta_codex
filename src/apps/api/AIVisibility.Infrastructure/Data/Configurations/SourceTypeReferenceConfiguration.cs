using AIVisibility.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AIVisibility.Infrastructure.Data.Configurations;

public class SourceTypeReferenceConfiguration : IEntityTypeConfiguration<SourceTypeReference>
{
    public void Configure(EntityTypeBuilder<SourceTypeReference> builder)
    {
        builder.ToTable("source_types");
        builder.HasKey(s => s.Id);
        builder.Property(s => s.Id).HasColumnName("id");

        builder.Property(s => s.Code).HasColumnName("code")
            .HasMaxLength(50).IsRequired();
        builder.Property(s => s.Name).HasColumnName("name")
            .HasMaxLength(100).IsRequired();
        builder.Property(s => s.Description).HasColumnName("description")
            .HasMaxLength(500).IsRequired();
        builder.Property(s => s.DisplayOrder).HasColumnName("display_order");

        builder.HasIndex(s => s.Code).IsUnique();
    }
}
