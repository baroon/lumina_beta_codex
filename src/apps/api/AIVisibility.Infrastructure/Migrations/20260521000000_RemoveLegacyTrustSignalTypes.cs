using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AIVisibility.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class RemoveLegacyTrustSignalTypes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Remap old signal types to new curated categories
            migrationBuilder.Sql(
                "UPDATE trust_signals SET signal_type = 'TestimonialsAndReviews' WHERE signal_type = 'ReviewsTestimonials'");
            migrationBuilder.Sql(
                "UPDATE trust_signals SET signal_type = 'CaseStudiesAndSuccessMetrics' WHERE signal_type = 'CaseStudies'");
            migrationBuilder.Sql(
                "UPDATE trust_signals SET signal_type = 'CertificationsAndAccreditations' WHERE signal_type = 'Certifications'");
            migrationBuilder.Sql(
                "UPDATE trust_signals SET signal_type = 'AwardsAndRecognitions' WHERE signal_type = 'Awards'");
            migrationBuilder.Sql(
                "UPDATE trust_signals SET signal_type = 'ClientAndPartnerLogos' WHERE signal_type IN ('Partnerships', 'SocialProof')");
            migrationBuilder.Sql(
                "UPDATE trust_signals SET signal_type = 'PressAndMediaMentions' WHERE signal_type = 'MediaMentions'");
            migrationBuilder.Sql(
                "UPDATE trust_signals SET signal_type = 'ExpertEndorsements' WHERE signal_type = 'ExpertEndorsement'");

            // Delete rows with signal types that have no meaningful mapping
            migrationBuilder.Sql(
                "DELETE FROM trust_signals WHERE signal_type IN ('PricingTransparency', 'SecurityCompliance', 'MoneyBackGuarantee', 'FreeTrial', 'PrivacyPolicy', 'TermsOfService')");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Reverse the remap — best-effort reverse mapping
            migrationBuilder.Sql(
                "UPDATE trust_signals SET signal_type = 'ReviewsTestimonials' WHERE signal_type = 'TestimonialsAndReviews'");
            migrationBuilder.Sql(
                "UPDATE trust_signals SET signal_type = 'CaseStudies' WHERE signal_type = 'CaseStudiesAndSuccessMetrics'");
            migrationBuilder.Sql(
                "UPDATE trust_signals SET signal_type = 'Certifications' WHERE signal_type = 'CertificationsAndAccreditations'");
            migrationBuilder.Sql(
                "UPDATE trust_signals SET signal_type = 'Awards' WHERE signal_type = 'AwardsAndRecognitions'");
            migrationBuilder.Sql(
                "UPDATE trust_signals SET signal_type = 'Partnerships' WHERE signal_type = 'ClientAndPartnerLogos'");
            migrationBuilder.Sql(
                "UPDATE trust_signals SET signal_type = 'MediaMentions' WHERE signal_type = 'PressAndMediaMentions'");
            migrationBuilder.Sql(
                "UPDATE trust_signals SET signal_type = 'ExpertEndorsement' WHERE signal_type = 'ExpertEndorsements'");
        }
    }
}
