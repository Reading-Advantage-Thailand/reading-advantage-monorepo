import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ModeToggle } from '@/components/mode-toggle';
import {
  IconChevronRight,
  IconBook,
  IconBrain,
  IconChartBar,
  IconUsers,
  IconRocket,
  IconCheck,
  IconDeviceDesktop,
  IconWifi,
  IconTools,
  IconMail,
  IconCalendar,
} from '@tabler/icons-react';
import { getSession } from '@/lib/auth/server';

export default async function HomePage() {
  const session = await getSession();
  return (
    <div className="flex min-h-screen flex-col">
      {/* Navigation */}
      <header className="border-b bg-white dark:bg-gray-900">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/science-advantage.png"
              alt="Science Advantage"
              width={40}
              height={40}
              className="rounded-lg"
            />
            <span className="font-bold text-xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Science Advantage
            </span>
          </div>
          <nav className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <ModeToggle />
              {session ? (
                <Link href={`/${session.user.role.toLowerCase()}`}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-rose-300 text-rose-800 hover:bg-rose-50 dark:border-rose-700 dark:text-rose-300 dark:hover:bg-rose-950"
                  >
                    Dashboard
                  </Button>
                </Link>
              ) : (
                <Link href="/signin">
                  <Button
                    size="sm"
                    className="bg-rose-600 hover:bg-rose-700 text-white"
                  >
                    Log in
                  </Button>
                </Link>
              )}
            </div>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/home_page/hero.png"
            alt="Science Education Background"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-br from-rose-900/40 via-rose-800/30 to-pink-900/40"></div>
        </div>

        <div className="relative z-10 container flex flex-col items-center text-center gap-6">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight max-w-4xl text-white">
            The Future of K-12 Science Education
            <span className="block text-2xl md:text-4xl text-rose-200 mt-2">
              Coming 2025
            </span>
          </h1>
          <p className="text-lg text-white/90 max-w-3xl">
            Comprehensive, standards-aligned science curriculum with NGSS
            alignment and adaptive learning technology. Designed for
            classroom-first education with 180 days of structured instruction.
          </p>
          <div className="flex gap-4 mt-8">
            <Button
              size="lg"
              className="bg-white text-rose-800 hover:bg-gray-100 gap-2 text-lg px-8"
            >
              Join Waitlist <IconChevronRight size={20} />
            </Button>
            <Button
              size="lg"
              className="bg-white text-rose-800 hover:bg-gray-100 text-lg px-8"
            >
              Learn More
            </Button>
          </div>
          <div className="mt-6 text-sm text-white/80">
            Launch Expected 2025 • Early Access Available
          </div>
        </div>
      </section>

      {/* Core Value Proposition */}
      <section className="py-20 bg-white dark:bg-gray-900">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Transforming Science Education
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              Our comprehensive platform brings together cutting-edge technology
              with proven educational methods to create an unparalleled learning
              experience for K-12 students.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center rounded-lg overflow-hidden bg-rose-50 dark:bg-rose-950/20">
              <div className="w-full">
                <Image
                  src="/home_page/standards_aligned.png"
                  alt="Standards Aligned Curriculum"
                  width={400}
                  height={300}
                  className="w-full h-auto"
                />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Standards-Aligned Curriculum
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Full K-12 science curriculum aligned with NGSS disciplinary
                  core ideas and state standards.
                </p>
              </div>
            </div>

            <div className="text-center rounded-lg overflow-hidden bg-rose-50 dark:bg-rose-950/20">
              <div className="w-full">
                <Image
                  src="/home_page/adaptive_learning.png"
                  alt="Adaptive Learning System"
                  width={400}
                  height={300}
                  className="w-full h-auto"
                />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Adaptive Learning
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Three-track difficulty system that automatically adjusts based
                  on student performance.
                </p>
              </div>
            </div>

            <div className="text-center rounded-lg overflow-hidden bg-rose-50 dark:bg-rose-950/20">
              <div className="w-full">
                <Image
                  src="/home_page/classroom_first.png"
                  alt="Classroom First Design"
                  width={400}
                  height={300}
                  className="w-full h-auto"
                />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Classroom-First Design
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Built for seamless integration into existing school systems
                  with teacher-centric tools.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Key Features */}
      <section className="py-20 bg-gray-50 dark:bg-gray-800">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Comprehensive Learning Platform
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              Everything needed for modern science education in one integrated
              platform.
            </p>
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            <div className="lg:w-1/3">
              <div className="rounded-lg overflow-hidden bg-white dark:bg-gray-900 shadow-sm border border-gray-200 dark:border-gray-700 h-full">
                <Image
                  src="/home_page/modern_learning.png"
                  alt="Modern Learning Experience"
                  width={400}
                  height={600}
                  className="w-full h-auto"
                />
              </div>
            </div>

            <div className="lg:w-2/3 grid md:grid-cols-2 gap-8">
              <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <IconBook
                  className="text-rose-600 dark:text-rose-300 mb-4"
                  size={24}
                />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Comprehensive Curriculum Coverage
                </h3>
                <ul className="space-y-2 text-gray-600 dark:text-gray-400">
                  <li className="flex items-start gap-2">
                    <IconCheck className="text-rose-500 mt-0.5" size={16} />
                    <span>Full K-12 science curriculum</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <IconCheck className="text-rose-500 mt-0.5" size={16} />
                    <span>NGSS disciplinary core ideas coverage</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <IconCheck className="text-rose-500 mt-0.5" size={16} />
                    <span>180 days of structured instruction</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <IconCheck className="text-rose-500 mt-0.5" size={16} />
                    <span>Grade-appropriate content progression</span>
                  </li>
                </ul>
              </div>

              <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <IconBrain
                  className="text-rose-600 dark:text-rose-300 mb-4"
                  size={24}
                />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Adaptive Learning System
                </h3>
                <ul className="space-y-2 text-gray-600 dark:text-gray-400">
                  <li className="flex items-start gap-2">
                    <IconCheck className="text-rose-500 mt-0.5" size={16} />
                    <span>Three-track difficulty system</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <IconCheck className="text-rose-500 mt-0.5" size={16} />
                    <span>Automatic performance-based adjustment</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <IconCheck className="text-rose-500 mt-0.5" size={16} />
                    <span>Personalized learning paths</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <IconCheck className="text-rose-500 mt-0.5" size={16} />
                    <span>Built-in support for struggling students</span>
                  </li>
                </ul>
              </div>

              <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <IconChartBar
                  className="text-rose-600 dark:text-rose-300 mb-4"
                  size={24}
                />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Integrated Assessment Tools
                </h3>
                <ul className="space-y-2 text-gray-600 dark:text-gray-400">
                  <li className="flex items-start gap-2">
                    <IconCheck className="text-rose-500 mt-0.5" size={16} />
                    <span>Multiple assessment types</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <IconCheck className="text-rose-500 mt-0.5" size={16} />
                    <span>Real-time progress tracking</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <IconCheck className="text-rose-500 mt-0.5" size={16} />
                    <span>NGSS standards alignment</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <IconCheck className="text-rose-500 mt-0.5" size={16} />
                    <span>Automated feedback systems</span>
                  </li>
                </ul>
              </div>

              <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <IconUsers
                  className="text-rose-600 dark:text-rose-300 mb-4"
                  size={24}
                />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Teacher Support Features
                </h3>
                <ul className="space-y-2 text-gray-600 dark:text-gray-400">
                  <li className="flex items-start gap-2">
                    <IconCheck className="text-rose-500 mt-0.5" size={16} />
                    <span>Comprehensive lesson plans</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <IconCheck className="text-rose-500 mt-0.5" size={16} />
                    <span>Class management tools</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <IconCheck className="text-rose-500 mt-0.5" size={16} />
                    <span>Customizable assessments</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <IconCheck className="text-rose-500 mt-0.5" size={16} />
                    <span>Progress tracking dashboards</span>
                  </li>
                </ul>
              </div>

              <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <IconRocket
                  className="text-rose-600 dark:text-rose-300 mb-4"
                  size={24}
                />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Modern Learning Experience
                </h3>
                <ul className="space-y-2 text-gray-600 dark:text-gray-400">
                  <li className="flex items-start gap-2">
                    <IconCheck className="text-rose-500 mt-0.5" size={16} />
                    <span>Current scientific discoveries</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <IconCheck className="text-rose-500 mt-0.5" size={16} />
                    <span>Real-world experiments</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <IconCheck className="text-rose-500 mt-0.5" size={16} />
                    <span>Cross-curricular connections</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <IconCheck className="text-rose-500 mt-0.5" size={16} />
                    <span>Collaborative learning tools</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Target Audience */}
      <section className="py-20 bg-white dark:bg-gray-900">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Built for Every Role in Education
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              Tailored features and tools designed specifically for teachers,
              administrators, and districts.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center rounded-lg overflow-hidden bg-rose-50 dark:bg-rose-950/20">
              <div className="w-full">
                <Image
                  src="/home_page/for_teachers.png"
                  alt="For Teachers"
                  width={400}
                  height={300}
                  className="w-full h-auto"
                />
              </div>
              <div className="p-6">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  For Teachers
                </h3>
                <ul className="space-y-3 text-left text-gray-600 dark:text-gray-400">
                  <li className="flex items-start gap-3">
                    <IconCheck className="text-rose-500 mt-1" size={20} />
                    <span>Lesson planning and management features</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <IconCheck className="text-rose-500 mt-1" size={20} />
                    <span>Assessment and tracking tools</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <IconCheck className="text-rose-500 mt-1" size={20} />
                    <span>Professional development support</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <IconCheck className="text-rose-500 mt-1" size={20} />
                    <span>Time-saving automation</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="text-center rounded-lg overflow-hidden bg-rose-50 dark:bg-rose-950/20">
              <div className="w-full">
                <Image
                  src="/home_page/for_admin.png"
                  alt="For Administrators"
                  width={400}
                  height={300}
                  className="w-full h-auto"
                />
              </div>
              <div className="p-6">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  For Administrators
                </h3>
                <ul className="space-y-3 text-left text-gray-600 dark:text-gray-400">
                  <li className="flex items-start gap-3">
                    <IconCheck className="text-rose-500 mt-1" size={20} />
                    <span>NGSS compliance tools</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <IconCheck className="text-rose-500 mt-1" size={20} />
                    <span>School-wide implementation support</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <IconCheck className="text-rose-500 mt-1" size={20} />
                    <span>Progress tracking across classes</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <IconCheck className="text-rose-500 mt-1" size={20} />
                    <span>Professional development resources</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="text-center rounded-lg overflow-hidden bg-rose-50 dark:bg-rose-950/20">
              <div className="w-full">
                <Image
                  src="/home_page/for_districts.png"
                  alt="For Districts"
                  width={400}
                  height={300}
                  className="w-full h-auto"
                />
              </div>
              <div className="p-6">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  For Districts
                </h3>
                <ul className="space-y-3 text-left text-gray-600 dark:text-gray-400">
                  <li className="flex items-start gap-3">
                    <IconCheck className="text-rose-500 mt-1" size={20} />
                    <span>Standardization across schools</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <IconCheck className="text-rose-500 mt-1" size={20} />
                    <span>District-wide analytics</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <IconCheck className="text-rose-500 mt-1" size={20} />
                    <span>Implementation support</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <IconCheck className="text-rose-500 mt-1" size={20} />
                    <span>Training programs</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Technical Requirements */}
      <section className="py-20 bg-gray-50 dark:bg-gray-800">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Technical Requirements
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              Simple requirements for seamless integration into your existing
              infrastructure.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <IconDeviceDesktop
                  className="text-rose-600 dark:text-rose-300 mb-4 mx-auto"
                  size={32}
                />
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Device Compatibility
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Works on tablets, laptops, and desktop computers with modern
                  web browsers
                </p>
              </div>
            </div>

            <div className="text-center">
              <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <IconWifi
                  className="text-rose-600 dark:text-rose-300 mb-4 mx-auto"
                  size={32}
                />
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Internet Connectivity
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Standard broadband connection recommended for optimal
                  experience
                </p>
              </div>
            </div>

            <div className="text-center">
              <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <IconTools
                  className="text-rose-600 dark:text-rose-300 mb-4 mx-auto"
                  size={32}
                />
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  IT Support
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Minimal IT overhead with cloud-based infrastructure and
                  automatic updates
                </p>
              </div>
            </div>

            <div className="text-center">
              <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <IconCalendar
                  className="text-rose-600 dark:text-rose-300 mb-4 mx-auto"
                  size={32}
                />
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Implementation Timeline
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Quick setup process with comprehensive onboarding and training
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 bg-gradient-to-r from-rose-700 to-pink-700 text-white">
        <div className="container text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Transform Science Education?
          </h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto opacity-90">
            Join the waitlist for early access and be among the first to
            experience the future of K-12 science education.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="bg-white text-rose-600 hover:bg-gray-100 gap-2 text-lg px-8"
            >
              <IconMail size={20} />
              Join Waitlist
            </Button>
            <Button
              size="lg"
              className="bg-white text-rose-600 hover:bg-gray-100 text-lg px-8"
            >
              Request Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Image
                  src="/science-advantage.png"
                  alt="Science Advantage"
                  width={32}
                  height={32}
                  className="rounded-lg"
                />
                <span className="font-bold text-xl">Science Advantage</span>
              </div>
              <p className="text-gray-400">
                The Future of K-12 Science Education
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <Link href="#" className="hover:text-white transition-colors">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white transition-colors">
                    Curriculum
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white transition-colors">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white transition-colors">
                    Demo
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <Link href="#" className="hover:text-white transition-colors">
                    Sample Lessons
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white transition-colors">
                    Implementation Guide
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white transition-colors">
                    Research
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white transition-colors">
                    Case Studies
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <Link href="#" className="hover:text-white transition-colors">
                    About Us
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white transition-colors">
                    Contact
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white transition-colors">
                    Partners
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white transition-colors">
                    Careers
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
            <div className="text-gray-400 text-sm mb-4 md:mb-0">
              © {new Date().getFullYear()} Science Advantage. All rights
              reserved.
            </div>
            <div className="flex gap-6 text-gray-400 text-sm">
              <Link href="#" className="hover:text-white transition-colors">
                Privacy Policy
              </Link>
              <Link href="#" className="hover:text-white transition-colors">
                Terms of Service
              </Link>
              <Link href="#" className="hover:text-white transition-colors">
                Cookie Policy
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
