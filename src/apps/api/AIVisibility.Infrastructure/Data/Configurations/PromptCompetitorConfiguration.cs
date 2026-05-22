using AIVisibility.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AIVisibility.Infrastructure.Data.Configurations;

public class PromptCompetitorConfiguration : IEntityTypeConfiguration<PromptCompetitor>
{
    public void Configure(EntityTypeBuilder<PromptCompetitor> builder)
    {
        builder.ToTable("prompt_competitors");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.PromptId).HasColumnName("prompt_id");
        builder.Property(x => x.CompetitorId).HasColumnName("competitor_id");
        builder.HasIndex(x => x.PromptId);
    }
}
