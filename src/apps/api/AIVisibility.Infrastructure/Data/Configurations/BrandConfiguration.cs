using AIVisibility.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AIVisibility.Infrastructure.Data.Configurations;

public class BrandConfiguration : IEntityTypeConfiguration<Brand>
{
    public void Configure(EntityTypeBuilder<Brand> builder)
    {
        builder.ToTable("brands");
        builder.HasKey(b => b.Id);
        builder.Property(b => b.Id).HasColumnName("id");
        builder.Property(b => b.Name).HasColumnName("name").HasMaxLength(200).IsRequired();
        builder.Property(b => b.WebsiteUrl).HasColumnName("website_url").HasMaxLength(2048).IsRequired();
        builder.Property(b => b.WorkspaceId).HasColumnName("workspace_id");
        builder.Property(b => b.CreatedAt).HasColumnName("created_at");
        builder.Property(b => b.UpdatedAt).HasColumnName("updated_at");

        builder.HasMany(b => b.DiscoveryRuns).WithOne(d => d.Brand).HasForeignKey(d => d.BrandId);
        builder.HasOne(b => b.BrandProfile).WithOne(bp => bp.Brand).HasForeignKey<BrandProfile>(bp => bp.BrandId);
        builder.HasMany(b => b.Products).WithOne(p => p.Brand).HasForeignKey(p => p.BrandId);
        builder.HasMany(b => b.Audiences).WithOne(a => a.Brand).HasForeignKey(a => a.BrandId);
        builder.HasMany(b => b.Markets).WithOne(m => m.Brand).HasForeignKey(m => m.BrandId);
        builder.HasMany(b => b.Topics).WithOne(t => t.Brand).HasForeignKey(t => t.BrandId);
        builder.HasMany(b => b.Competitors).WithOne(c => c.Brand).HasForeignKey(c => c.BrandId);
        builder.HasMany(b => b.TrustSignals).WithOne(ts => ts.Brand).HasForeignKey(ts => ts.BrandId);
    }
}
