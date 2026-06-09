using AIVisibility.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AIVisibility.Infrastructure.Data.Configurations;

public class PromptConfiguration : IEntityTypeConfiguration<Prompt>
{
    public void Configure(EntityTypeBuilder<Prompt> builder)
    {
        builder.ToTable("prompts");
        builder.HasKey(p => p.Id);
        builder.Property(p => p.Id).HasColumnName("id");
        builder.Property(p => p.TrackerConfigurationId).HasColumnName("tracker_configuration_id");
        builder.Property(p => p.PromptText).HasColumnName("prompt_text").HasMaxLength(2000).IsRequired();
        builder.Property(p => p.LensId).HasColumnName("lens_id");
        builder.Property(p => p.PromptTemplateId).HasColumnName("prompt_template_id");
        builder.Property(p => p.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(50);
        builder.Property(p => p.Source).HasColumnName("source").HasConversion<string>().HasMaxLength(50);
        builder.Property(p => p.ArchivedAt).HasColumnName("archived_at");
        builder.Property(p => p.CreatedAt).HasColumnName("created_at");
        builder.Property(p => p.UpdatedAt).HasColumnName("updated_at");

        builder.HasOne(p => p.TrackerConfiguration).WithMany().HasForeignKey(p => p.TrackerConfigurationId);
        builder.HasMany(p => p.Topics).WithOne(x => x.Prompt).HasForeignKey(x => x.PromptId);
        builder.HasMany(p => p.Competitors).WithOne(x => x.Prompt).HasForeignKey(x => x.PromptId);
        builder.HasMany(p => p.Products).WithOne(x => x.Prompt).HasForeignKey(x => x.PromptId);
        builder.HasMany(p => p.Audiences).WithOne(x => x.Prompt).HasForeignKey(x => x.PromptId);
        builder.HasMany(p => p.Markets).WithOne(x => x.Prompt).HasForeignKey(x => x.PromptId);

        // No-nav FK to lenses: prompts must reference a real lens; lenses are
        // seed reference data so Restrict (not Cascade) — accidental lens
        // deletion shouldn't wipe live prompts.
        builder.HasOne<Lens>()
            .WithMany()
            .HasForeignKey(p => p.LensId)
            .OnDelete(DeleteBehavior.Restrict);

        // No-nav FK to prompt_templates: optional reference; SetNull preserves
        // the prompt (still valid content) but drops the lineage if the
        // template is removed.
        builder.HasOne<PromptTemplate>()
            .WithMany()
            .HasForeignKey(p => p.PromptTemplateId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(p => new { p.TrackerConfigurationId, p.Status })
            .HasDatabaseName("IX_prompts_tracker_status");
    }
}
