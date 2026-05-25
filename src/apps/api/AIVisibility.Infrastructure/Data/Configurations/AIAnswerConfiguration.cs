using AIVisibility.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AIVisibility.Infrastructure.Data.Configurations;

public class AIAnswerConfiguration : IEntityTypeConfiguration<AIAnswer>
{
    public void Configure(EntityTypeBuilder<AIAnswer> builder)
    {
        builder.ToTable("ai_answers");
        builder.HasKey(a => a.Id);
        builder.Property(a => a.Id).HasColumnName("id");
        builder.Property(a => a.PromptRunId).HasColumnName("prompt_run_id");
        builder.Property(a => a.AnswerText).HasColumnName("answer_text");
        builder.Property(a => a.RawResponse).HasColumnName("raw_response");
        builder.Property(a => a.CreatedAt).HasColumnName("created_at");

        builder.HasIndex(a => a.PromptRunId).IsUnique();
    }
}
