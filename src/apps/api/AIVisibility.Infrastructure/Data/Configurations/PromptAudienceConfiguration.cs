using AIVisibility.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AIVisibility.Infrastructure.Data.Configurations;

public class PromptAudienceConfiguration : IEntityTypeConfiguration<PromptAudience>
{
    public void Configure(EntityTypeBuilder<PromptAudience> builder)
    {
        builder.ToTable("prompt_audiences");
        builder.HasKey(x => new { x.PromptId, x.AudienceId });
        builder.Property(x => x.PromptId).HasColumnName("prompt_id");
        builder.Property(x => x.AudienceId).HasColumnName("audience_id");
        builder.HasIndex(x => x.AudienceId);

        builder.HasOne<Audience>()
            .WithMany()
            .HasForeignKey(x => x.AudienceId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
