import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield } from "lucide-react";
import nexaLogo from "@/assets/nexa-logo.svg";
import { useEffect } from "react";

export default function TermsPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-[#0A1F44] text-white selection:bg-[#00C2FF]/30 font-sans pb-20">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0A1F44]/95 backdrop-blur-xl border-b border-white/5 shadow-lg px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="bg-[#00C2FF]/10 rounded-2xl p-2 border border-[#00C2FF]/20 transition-transform group-hover:rotate-12">
              <img src={nexaLogo} className="h-8 w-8 invert brightness-0" alt="NEXA Logo" />
            </div>
            <span className="text-xl font-black font-['Montserrat',sans-serif] text-white tracking-tight uppercase italic">
              NEXA Store OS
            </span>
          </Link>

          <Link to="/">
            <Button variant="ghost" className="font-bold text-sm text-slate-200 hover:text-white rounded-xl gap-2 hover:bg-white/5">
              <ArrowLeft className="h-4 w-4" /> Back to Home
            </Button>
          </Link>
        </div>
      </nav>

      {/* Header section */}
      <div className="relative pt-32 pb-12 overflow-hidden bg-gradient-to-b from-[#0A1C2D] to-[#0A1F44] text-center px-6">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#00C2FF]/5 blur-[120px]" />
          <div className="absolute bottom-[10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#1A73E8]/5 blur-[150px]" />
        </div>

        <div className="max-w-3xl mx-auto space-y-4 relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#00C2FF]/30 bg-[#00C2FF]/5 px-4 py-1.5">
            <Shield className="h-4 w-4 text-[#00C2FF]" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#00C2FF]">Legal Agreement</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black font-['Montserrat',sans-serif] tracking-tight uppercase italic text-white">
            Terms & Conditions of Use
          </h1>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
            Effective Date: 4 June 2026
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 mt-8">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden text-left">
          <div className="absolute inset-0 bg-gradient-to-tr from-[#00C2FF]/5 to-transparent pointer-events-none" />
          
          <div className="space-y-10 relative z-10 text-slate-300 text-sm md:text-base leading-relaxed font-medium">
            <p className="text-slate-200 border-b border-white/5 pb-6">
              Please read these Terms & Conditions carefully before using NEXAOS or any related services. By accessing or using our platform, you agree to be bound by these terms.
            </p>

            {/* Section 1 */}
            <div className="space-y-3">
              <h2 className="text-lg md:text-xl font-bold font-['Montserrat',sans-serif] uppercase tracking-tight text-[#00C2FF] flex items-baseline gap-2">
                <span>1.</span> INTRODUCTION
              </h2>
              <p>
                Welcome to <strong className="text-white">NEXAOS (Nexa Operating System)</strong> and all related services provided by <strong className="text-white">Nexa Digital Solutions Ltd ("we", "us", "our")</strong>.
              </p>
              <p>
                By accessing or using our platform, website, mobile application, or services, you agree to be bound by these Terms & Conditions. If you do not agree, you must stop using the service immediately.
              </p>
            </div>

            {/* Section 2 */}
            <div className="space-y-3">
              <h2 className="text-lg md:text-xl font-bold font-['Montserrat',sans-serif] uppercase tracking-tight text-[#00C2FF] flex items-baseline gap-2">
                <span>2.</span> DEFINITIONS
              </h2>
              <ul className="space-y-2 list-disc list-inside pl-2">
                <li><strong className="text-white">Platform:</strong> NEXAOS Store, NEXA Vendors, and all related digital services.</li>
                <li><strong className="text-white">User:</strong> Any individual or business using the platform.</li>
                <li><strong className="text-white">Vendor:</strong> Registered business using NEXAOS or NEXA Vendors.</li>
                <li><strong className="text-white">Customer:</strong> End-user purchasing goods/services via Vendor.</li>
                <li><strong className="text-white">Service:</strong> All software, tools, analytics, and integrations provided by NEXA.</li>
              </ul>
            </div>

            {/* Section 3 */}
            <div className="space-y-3">
              <h2 className="text-lg md:text-xl font-bold font-['Montserrat',sans-serif] uppercase tracking-tight text-[#00C2FF] flex items-baseline gap-2">
                <span>3.</span> ELIGIBILITY
              </h2>
              <p>To use our services, you must:</p>
              <ul className="space-y-2 list-disc list-inside pl-2">
                <li>Be at least 18 years old OR a legally registered business representative.</li>
                <li>Provide accurate business information.</li>
                <li>Comply with all applicable laws in Nigeria or your jurisdiction.</li>
                <li>Not use the platform for illegal, fraudulent, or unauthorized activities.</li>
              </ul>
            </div>

            {/* Section 4 */}
            <div className="space-y-3">
              <h2 className="text-lg md:text-xl font-bold font-['Montserrat',sans-serif] uppercase tracking-tight text-[#00C2FF] flex items-baseline gap-2">
                <span>4.</span> ACCOUNT REGISTRATION
              </h2>
              <p>Users must:</p>
              <ul className="space-y-2 list-disc list-inside pl-2">
                <li>Provide accurate and complete information.</li>
                <li>Maintain confidentiality of login credentials.</li>
                <li>Be responsible for all activity under their account.</li>
                <li>Notify us immediately of unauthorized access.</li>
              </ul>
              <p>
                We reserve the right to suspend or terminate accounts for false information or abuse.
              </p>
            </div>

            {/* Section 5 */}
            <div className="space-y-4">
              <h2 className="text-lg md:text-xl font-bold font-['Montserrat',sans-serif] uppercase tracking-tight text-[#00C2FF] flex items-baseline gap-2">
                <span>5.</span> SERVICES PROVIDED
              </h2>
              
              <div className="space-y-2">
                <h3 className="text-white font-bold uppercase tracking-wider text-sm">NEXAOS (Business Operating System)</h3>
                <ul className="space-y-1 list-disc list-inside pl-4 text-slate-400">
                  <li>Inventory management</li>
                  <li>Sales tracking</li>
                  <li>Receipt generation</li>
                  <li>Customer management</li>
                  <li>Analytics dashboard</li>
                  <li>WhatsApp notifications</li>
                  <li>Business reporting</li>
                </ul>
              </div>

              <div className="space-y-2 pt-2">
                <h3 className="text-white font-bold uppercase tracking-wider text-sm">NEXA Vendors (Social Commerce Platform)</h3>
                <ul className="space-y-1 list-disc list-inside pl-4 text-slate-400">
                  <li>Online storefronts</li>
                  <li>Product listings</li>
                  <li>Vendor discovery</li>
                  <li>Customer follow system</li>
                  <li>Payment integration</li>
                  <li>Lead generation tools</li>
                </ul>
              </div>
            </div>

            {/* Section 6 */}
            <div className="space-y-3">
              <h2 className="text-lg md:text-xl font-bold font-['Montserrat',sans-serif] uppercase tracking-tight text-[#00C2FF] flex items-baseline gap-2">
                <span>6.</span> SUBSCRIPTION & PAYMENT
              </h2>
              <ul className="space-y-2 list-disc list-inside pl-2">
                <li>Services are provided on a subscription basis (monthly or annually).</li>
                <li>Pricing is clearly displayed on the platform.</li>
                <li>Payments are non-refundable except where required by law.</li>
                <li>Failure to pay may result in restricted access.</li>
              </ul>
              <p>
                We reserve the right to modify pricing with prior notice.
              </p>
            </div>

            {/* Section 7 */}
            <div className="space-y-3">
              <h2 className="text-lg md:text-xl font-bold font-['Montserrat',sans-serif] uppercase tracking-tight text-[#00C2FF] flex items-baseline gap-2">
                <span>7.</span> USER CONTENT & DATA
              </h2>
              <p>Users retain ownership of their data, including:</p>
              <ul className="space-y-1 list-disc list-inside pl-4 text-slate-400">
                <li>Products</li>
                <li>Customer information</li>
                <li>Sales records</li>
                <li>Business reports</li>
              </ul>
              <p>By using the platform, you grant NEXA permission to:</p>
              <ul className="space-y-1 list-disc list-inside pl-4 text-slate-400">
                <li>Store and process your data</li>
                <li>Generate analytics</li>
                <li>Provide automated insights</li>
                <li>Send business notifications</li>
              </ul>
              <p>We do NOT sell user data to third parties.</p>
            </div>

            {/* Section 8 */}
            <div className="space-y-3">
              <h2 className="text-lg md:text-xl font-bold font-['Montserrat',sans-serif] uppercase tracking-tight text-[#00C2FF] flex items-baseline gap-2">
                <span>8.</span> WHATSAPP & NOTIFICATIONS
              </h2>
              <p>By using NEXAOS, you agree that:</p>
              <ul className="space-y-2 list-disc list-inside pl-2">
                <li>Business updates may be sent via WhatsApp, SMS, or email.</li>
                <li>Notifications include sales summaries, alerts, and reminders.</li>
                <li>Users can manage notification preferences.</li>
              </ul>
            </div>

            {/* Section 9 */}
            <div className="space-y-3">
              <h2 className="text-lg md:text-xl font-bold font-['Montserrat',sans-serif] uppercase tracking-tight text-[#00C2FF] flex items-baseline gap-2">
                <span>9.</span> TRUST & VERIFICATION (NEXA VENDORS)
              </h2>
              <p>Vendor badges may include:</p>
              <ul className="space-y-1 list-disc list-inside pl-4 text-slate-400">
                <li>Phone Verified</li>
                <li>Business Verified</li>
                <li>Trusted Vendor</li>
                <li>Premium Vendor</li>
              </ul>
              <p>Verification does not guarantee product quality but improves trust visibility.</p>
            </div>

            {/* Section 10 */}
            <div className="space-y-3">
              <h2 className="text-lg md:text-xl font-bold font-['Montserrat',sans-serif] uppercase tracking-tight text-[#00C2FF] flex items-baseline gap-2">
                <span>10.</span> PROHIBITED ACTIVITIES
              </h2>
              <p>Users must NOT:</p>
              <ul className="space-y-2 list-disc list-inside pl-2">
                <li>Use the platform for illegal sales.</li>
                <li>Upload fraudulent products.</li>
                <li>Manipulate sales data.</li>
                <li>Attempt system hacking or reverse engineering.</li>
                <li>Spam customers or misuse contact data.</li>
                <li>Create false vendor identities.</li>
              </ul>
              <p>Violation may lead to immediate suspension.</p>
            </div>

            {/* Section 11 */}
            <div className="space-y-3">
              <h2 className="text-lg md:text-xl font-bold font-['Montserrat',sans-serif] uppercase tracking-tight text-[#00C2FF] flex items-baseline gap-2">
                <span>11.</span> THIRD-PARTY SERVICES
              </h2>
              <p>
                NEXA may integrate with third-party services such as payment gateways (Paystack, Monnify, etc.), messaging services (WhatsApp API, email tools), and cloud infrastructure providers. We are not responsible for failures caused by third-party services.
              </p>
            </div>

            {/* Section 12 */}
            <div className="space-y-3">
              <h2 className="text-lg md:text-xl font-bold font-['Montserrat',sans-serif] uppercase tracking-tight text-[#00C2FF] flex items-baseline gap-2">
                <span>12.</span> LIMITATION OF LIABILITY
              </h2>
              <p>NEXA is not liable for:</p>
              <ul className="space-y-2 list-disc list-inside pl-2">
                <li>Business losses or loss of profit.</li>
                <li>Customer disputes between vendors and buyers.</li>
                <li>Internet or system downtime.</li>
                <li>External service failures.</li>
              </ul>
              <p>Users operate their businesses independently on the platform.</p>
            </div>

            {/* Section 13 */}
            <div className="space-y-3">
              <h2 className="text-lg md:text-xl font-bold font-['Montserrat',sans-serif] uppercase tracking-tight text-[#00C2FF] flex items-baseline gap-2">
                <span>13.</span> DATA SECURITY
              </h2>
              <p>
                We implement industry-standard security practices, but users are responsible for securing their accounts. We cannot guarantee 100% protection against external threats.
              </p>
            </div>

            {/* Section 14 */}
            <div className="space-y-3">
              <h2 className="text-lg md:text-xl font-bold font-['Montserrat',sans-serif] uppercase tracking-tight text-[#00C2FF] flex items-baseline gap-2">
                <span>14.</span> SERVICE AVAILABILITY
              </h2>
              <p>
                We aim for continuous uptime but do not guarantee uninterrupted service or error-free performance. Maintenance may occur periodically.
              </p>
            </div>

            {/* Section 15 */}
            <div className="space-y-3">
              <h2 className="text-lg md:text-xl font-bold font-['Montserrat',sans-serif] uppercase tracking-tight text-[#00C2FF] flex items-baseline gap-2">
                <span>15.</span> TERMINATION
              </h2>
              <p>We reserve the right to suspend accounts, remove vendors, or restrict access for:</p>
              <ul className="space-y-2 list-disc list-inside pl-2">
                <li>Fraud or abuse.</li>
                <li>Non-payment of subscription fees.</li>
                <li>Policy violations.</li>
              </ul>
              <p>Users may also terminate their account at any time.</p>
            </div>

            {/* Section 16 */}
            <div className="space-y-3">
              <h2 className="text-lg md:text-xl font-bold font-['Montserrat',sans-serif] uppercase tracking-tight text-[#00C2FF] flex items-baseline gap-2">
                <span>16.</span> REFUNDS POLICY
              </h2>
              <ul className="space-y-2 list-disc list-inside pl-2">
                <li>Subscription fees are generally non-refundable.</li>
                <li>Refunds may be issued in cases of system error or double payment.</li>
                <li>Refund decisions are at NEXA discretion unless legally required.</li>
              </ul>
            </div>

            {/* Section 17 */}
            <div className="space-y-3">
              <h2 className="text-lg md:text-xl font-bold font-['Montserrat',sans-serif] uppercase tracking-tight text-[#00C2FF] flex items-baseline gap-2">
                <span>17.</span> INTELLECTUAL PROPERTY
              </h2>
              <p>
                All system design, branding, and software belong to <strong className="text-white">Nexa Digital Solutions Ltd</strong>. Users may not copy, resell, or replicate the platform.
              </p>
            </div>

            {/* Section 18 */}
            <div className="space-y-3">
              <h2 className="text-lg md:text-xl font-bold font-['Montserrat',sans-serif] uppercase tracking-tight text-[#00C2FF] flex items-baseline gap-2">
                <span>18.</span> MODIFICATIONS
              </h2>
              <p>
                We may update these Terms at any time. Users will be notified of significant changes via email, platform notification, or WhatsApp message. Continued use of the platform constitutes acceptance of the modified Terms.
              </p>
            </div>

            {/* Section 19 */}
            <div className="space-y-3">
              <h2 className="text-lg md:text-xl font-bold font-['Montserrat',sans-serif] uppercase tracking-tight text-[#00C2FF] flex items-baseline gap-2">
                <span>19.</span> GOVERNING LAW
              </h2>
              <p>
                These Terms are governed by the laws of the <strong className="text-white">Federal Republic of Nigeria</strong>.
              </p>
            </div>

            {/* Section 20 */}
            <div className="space-y-3">
              <h2 className="text-lg md:text-xl font-bold font-['Montserrat',sans-serif] uppercase tracking-tight text-[#00C2FF] flex items-baseline gap-2">
                <span>20.</span> CONTACT INFORMATION
              </h2>
              <p>For questions or support, please contact:</p>
              <div className="mt-2 p-4 bg-white/5 border border-white/5 rounded-2xl space-y-1.5 font-mono text-xs md:text-sm">
                <p><span className="text-[#00C2FF]">Company:</span> Nexa Digital Solutions Ltd</p>
                <p><span className="text-[#00C2FF]">Email:</span> nexatechnologies.dev@gmail.com</p>
                <p><span className="text-[#00C2FF]">Phone:</span> +234 903 802 6109</p>
              </div>
            </div>

            <div className="border-t border-white/5 pt-8 text-center">
              <p className="text-xs font-black uppercase tracking-widest text-[#FFB800]">
                * FINAL AGREEMENT NOTICE *
              </p>
              <p className="text-xs text-slate-400 mt-2 max-w-xl mx-auto">
                By clicking "I Agree" or using any NEXA platform, you confirm that you have read, understood, and agree to comply with these terms.
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
