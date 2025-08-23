'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { 
  Shield, 
  Users, 
  TrendingUp, 
  CheckCircle, 
  ArrowRight,
  Building2,
  Landmark,
  Scale,
  Eye,
  Clock,
  Award
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { SignInButton, SignUpButton } from '@clerk/nextjs'

const fadeInUp = {
  initial: { opacity: 0, y: 40 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: "easeOut" }
}

const stagger = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
}

export default function LandingPage() {
  return (
    <div className="overflow-hidden">
      {/* Navigation */}
      <nav className="relative z-50 border-b border-white/10 bg-white/80 backdrop-blur-xl dark:bg-slate-900/80 dark:border-slate-800/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center space-x-3">
              <motion.div
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <Shield className="h-5 w-5 text-white" />
              </motion.div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Citadel Custody
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <SignInButton>
                <Button variant="ghost" size="sm">Sign In</Button>
              </SignInButton>
              <SignUpButton>
                <Button variant="premium" size="sm">Get Started</Button>
              </SignUpButton>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-20 pb-16 sm:pt-24 sm:pb-20">
        {/* Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-32 h-96 w-96 rounded-full bg-blue-400/30 blur-3xl" />
          <div className="absolute -bottom-40 -left-32 h-96 w-96 rounded-full bg-indigo-400/30 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            className="mx-auto max-w-4xl text-center"
            initial="initial"
            animate="animate"
            variants={stagger}
          >
            <motion.div variants={fadeInUp} className="mb-6">
              <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                <Award className="mr-2 h-4 w-4" />
                Enterprise-Grade Bitcoin Custody
              </span>
            </motion.div>

            <motion.h1
              variants={fadeInUp}
              className="text-4xl font-bold tracking-tight text-slate-900 sm:text-6xl lg:text-7xl dark:text-white"
            >
              The Future of{' '}
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                Institutional
              </span>{' '}
              Bitcoin Custody
            </motion.h1>

            <motion.p
              variants={fadeInUp}
              className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300"
            >
              Built for governments, institutions, and custody providers. 
              The only platform that combines regulatory compliance, 
              multi-signature security, and immutable audit trails in one solution.
            </motion.p>

            <motion.div
              variants={fadeInUp}
              className="mt-10 flex items-center justify-center gap-x-6"
            >
              <SignUpButton>
                <Button size="xl" variant="premium" rightIcon={<ArrowRight className="h-5 w-5" />}>
                  Start Free Trial
                </Button>
              </SignUpButton>
              <Button size="xl" variant="outline">
                Schedule Demo
              </Button>
            </motion.div>

            <motion.div
              variants={fadeInUp}
              className="mt-10 text-center"
            >
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Trusted by 50+ government agencies and financial institutions worldwide
              </p>
              <div className="mt-4 flex justify-center space-x-8 opacity-60">
                <Building2 className="h-8 w-8" />
                <Landmark className="h-8 w-8" />
                <Scale className="h-8 w-8" />
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            className="mx-auto max-w-2xl text-center"
            initial="initial"
            animate="animate"
            variants={fadeInUp}
          >
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
              Built for the Most Demanding Use Cases
            </h2>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
              From government treasuries to institutional custody, our platform handles 
              the most complex regulatory and operational requirements.
            </p>
          </motion.div>

          <motion.div
            className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
            initial="initial"
            animate="animate"
            variants={stagger}
          >
            {[
              {
                icon: Shield,
                title: "Government-Grade Security",
                description: "Multi-signature wallets with threshold policies, emergency freeze capabilities, and HSM integration.",
                gradient: "from-blue-500 to-blue-600"
              },
              {
                icon: Scale,
                title: "Regulatory Compliance",
                description: "Built-in KYC/AML, sanctions screening, SAR reporting, and compliance audit trails.",
                gradient: "from-green-500 to-emerald-600"
              },
              {
                icon: Eye,
                title: "Immutable Audit Trail",
                description: "Blockchain-based audit logging with tamper-proof evidence and compliance reporting.",
                gradient: "from-purple-500 to-violet-600"
              },
              {
                icon: Users,
                title: "Multi-Org Management",
                description: "Support for multiple institutions with role-based access controls and permissioned sharing.",
                gradient: "from-orange-500 to-red-600"
              },
              {
                icon: Clock,
                title: "Real-Time Monitoring",
                description: "Live transaction monitoring, risk assessment, and automated compliance checks.",
                gradient: "from-cyan-500 to-blue-600"
              },
              {
                icon: TrendingUp,
                title: "Institutional Scale",
                description: "Handle billions in assets across hundreds of users with enterprise-grade infrastructure.",
                gradient: "from-indigo-500 to-purple-600"
              }
            ].map((feature, index) => (
              <motion.div key={index} variants={fadeInUp}>
                <Card variant="premium" hover className="h-full">
                  <CardHeader>
                    <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r ${feature.gradient} shadow-lg`}>
                      <feature.icon className="h-6 w-6 text-white" />
                    </div>
                    <CardTitle className="mt-4">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Impact Section */}
      <section className="py-20 sm:py-24 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center text-white"
            initial="initial"
            animate="animate"
            variants={fadeInUp}
          >
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Transforming Global Finance
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-blue-100">
              Our platform is revolutionizing how institutions handle Bitcoin custody, 
              bringing transparency, security, and compliance to the entire ecosystem.
            </p>
          </motion.div>

          <motion.div
            className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4"
            initial="initial"
            animate="animate"
            variants={stagger}
          >
            {[
              { metric: "$50B+", label: "Assets Under Management" },
              { metric: "99.99%", label: "Uptime Guarantee" },
              { metric: "50+", label: "Government Agencies" },
              { metric: "24/7", label: "Security Monitoring" }
            ].map((stat, index) => (
              <motion.div key={index} variants={fadeInUp} className="text-center">
                <div className="text-3xl font-bold text-white">{stat.metric}</div>
                <div className="mt-1 text-blue-100">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Card variant="gradient" size="xl" className="text-center">
            <CardContent className="space-y-8">
              <div>
                <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
                  Ready to Secure Your Institution's Bitcoin?
                </h2>
                <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600 dark:text-slate-300">
                  Join the leading government agencies and financial institutions 
                  already using Citadel Custody for their Bitcoin infrastructure.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <SignUpButton>
                  <Button size="xl" variant="premium" rightIcon={<ArrowRight className="h-5 w-5" />}>
                    Start Free 30-Day Trial
                  </Button>
                </SignUpButton>
                <Button size="xl" variant="outline">
                  Book Enterprise Demo
                </Button>
              </div>
              
              <div className="flex justify-center space-x-8 text-sm text-slate-500">
                <div className="flex items-center">
                  <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                  SOC 2 Type II Certified
                </div>
                <div className="flex items-center">
                  <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                  99.99% Uptime SLA
                </div>
                <div className="flex items-center">
                  <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                  24/7 Expert Support
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600">
                <Shield className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Citadel Custody
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              © 2024 Citadel Custody. All rights reserved. 
              Securing the future of institutional Bitcoin custody.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
