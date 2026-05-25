using AIVisibility.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AIVisibility.Infrastructure.Data.Configurations;

public class TrackerConfigurationConfiguration : IEntityTypeConfiguration<TrackerConfiguration>
{
    public void Configure(EntityTypeBuilder<TrackerConfiguration> builder)
    {
        builder.ToTable("tracker_configurations");
        builder.HasKey(t => t.Id);
        builder.Property(t => t.Id).HasColumnName("id");
        builder.Property(t => t.BrandId).HasColumnName("brand_id");
        builder.Property(t => t.Name).HasColumnName("name").HasMaxLength(300).IsRequired();
        builder.Property(t => t.IsNameUserEdited).HasColumnName("is_name_user_edited");
        builder.Property(t => t.PromptAllocation).HasColumnName("prompt_allocation");
        builder.Property(t => t.Cadence).HasColumnName("cadence").HasConversion<string>().HasMaxLength(50);
        builder.Property(t => t.Timezone).HasColumnName("timezone").HasMaxLength(100).IsRequired();
        builder.Property(t => t.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(50);
        builder.Property(t => t.NextRunAt).HasColumnName("next_run_at");
        builder.Property(t => t.LastRunAt).HasColumnName("last_run_at");
        builder.Property(t => t.CreatedAt).HasColumnName("created_at");
        builder.Property(t => t.UpdatedAt).HasColumnName("updated_at");

        builder.HasOne(t => t.Brand).WithMany().HasForeignKey(t => t.BrandId);
        builder.HasMany(t => t.Topics).WithOne(x => x.TrackerConfiguration).HasForeignKey(x => x.TrackerConfigurationId);
        builder.HasMany(t => t.VisibilityLenses).WithOne(x => x.TrackerConfiguration).HasForeignKey(x => x.TrackerConfigurationId);
        builder.HasMany(t => t.Competitors).WithOne(x => x.TrackerConfiguration).HasForeignKey(x => x.TrackerConfigurationId);
        builder.HasMany(t => t.Products).WithOne(x => x.TrackerConfiguration).HasForeignKey(x => x.TrackerConfigurationId);
        builder.HasMany(t => t.Audiences).WithOne(x => x.TrackerConfiguration).HasForeignKey(x => x.TrackerConfigurationId);
        builder.HasMany(t => t.Markets).WithOne(x => x.TrackerConfiguration).HasForeignKey(x => x.TrackerConfigurationId);

        builder.HasIndex(t => t.BrandId);
    }
}
