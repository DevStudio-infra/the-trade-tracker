"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mail, MessageSquare, Phone, MapPin, ArrowRight, Send } from "lucide-react";
import Link from "next/link";

const contactInfo = [
  {
    title: "Email",
    value: "support@tradingai.com",
    description: "For general inquiries and support",
    icon: Mail,
  },
  {
    title: "Live Chat",
    value: "24/7 Support",
    description: "Get instant help from our team",
    icon: MessageSquare,
  },
  {
    title: "Phone",
    value: "+1 (555) 123-4567",
    description: "Mon-Fri from 9am to 5pm EST",
    icon: Phone,
  },
  {
    title: "Office",
    value: "New York, USA",
    description: "123 Trading Street, NY 10001",
    icon: MapPin,
  },
];

export default function ContactPage() {
  return (
    <div className="relative min-h-screen bg-gradient-to-b from-gray-50 via-gray-100 to-gray-50 dark:from-gray-900 dark:via-blue-900 dark:to-gray-900">
      {/* Animated background elements */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_800px_at_50%_-100%,#3b82f6,transparent)] opacity-30 dark:opacity-100" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_800px_at_80%_60%,rgba(59,130,246,0.2),transparent)] opacity-30 dark:opacity-100" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_800px_at_20%_40%,rgba(59,130,246,0.1),transparent)] opacity-30 dark:opacity-100" />
      </div>

      <div className="container relative py-24">
        {/* Header Section */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="mx-auto max-w-[800px] text-center">
          <h1 className="text-4xl font-bold tracking-tighter text-black dark:text-white sm:text-5xl md:text-6xl">Get in Touch</h1>
          <p className="mt-6 text-xl text-black/70 dark:text-white/70">Have questions about our AI trading platform? We&apos;re here to help.</p>
        </motion.div>

        {/* Contact Information Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mx-auto mt-16 grid max-w-[1200px] gap-8 md:grid-cols-2 lg:grid-cols-4">
          {contactInfo.map((info) => (
            <div
              key={info.title}
              className="group relative overflow-hidden rounded-xl border border-black/10 dark:border-white/10 bg-white/5 dark:bg-white/5 bg-black/5 p-6 backdrop-blur-xl transition-all hover:shadow-lg hover:shadow-blue-500/10">
              <div className="mb-4 flex items-center gap-4">
                <div className="rounded-full bg-blue-500/10 p-3">
                  <info.icon className="h-6 w-6 text-blue-500" />
                </div>
                <h3 className="text-lg font-semibold text-black/90 dark:text-white/90">{info.title}</h3>
              </div>
              <p className="text-lg font-medium text-black/80 dark:text-white/80">{info.value}</p>
              <p className="mt-1 text-sm text-black/60 dark:text-white/60">{info.description}</p>
            </div>
          ))}
        </motion.div>

        {/* Contact Form Section */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.4 }} className="mx-auto mt-16 max-w-[800px]">
          <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/5 dark:bg-white/5 bg-black/5 p-8 backdrop-blur-xl md:p-12">
            <h2 className="text-2xl font-bold text-black dark:text-white">Send us a Message</h2>
            <p className="mt-2 text-black/70 dark:text-white/70">Fill out the form below and we&apos;ll get back to you as soon as possible.</p>

            <form className="mt-8 space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-medium text-black/90 dark:text-white/90">
                    Name
                  </label>
                  <Input
                    id="name"
                    placeholder="John Doe"
                    className="border-black/10 bg-black/5 dark:border-white/10 dark:bg-white/5 placeholder:text-black/50 dark:placeholder:text-white/50"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium text-black/90 dark:text-white/90">
                    Email
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    className="border-black/10 bg-black/5 dark:border-white/10 dark:bg-white/5 placeholder:text-black/50 dark:placeholder:text-white/50"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="subject" className="text-sm font-medium text-black/90 dark:text-white/90">
                  Subject
                </label>
                <Input
                  id="subject"
                  placeholder="How can we help?"
                  className="border-black/10 bg-black/5 dark:border-white/10 dark:bg-white/5 placeholder:text-black/50 dark:placeholder:text-white/50"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="message" className="text-sm font-medium text-black/90 dark:text-white/90">
                  Message
                </label>
                <Textarea
                  id="message"
                  placeholder="Type your message here..."
                  className="min-h-[150px] border-black/10 bg-black/5 dark:border-white/10 dark:bg-white/5 placeholder:text-black/50 dark:placeholder:text-white/50"
                />
              </div>
              <div className="flex justify-end">
                <Button size="lg" className="rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
                  Send Message
                  <Send className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </form>
          </div>
        </motion.div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="mx-auto mt-24 max-w-[800px] rounded-2xl border border-black/10 dark:border-white/10 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 p-8 text-center backdrop-blur-xl md:p-12">
          <h2 className="text-2xl font-bold text-black dark:text-white md:text-3xl">Ready to Start Trading?</h2>
          <p className="mt-4 text-black/70 dark:text-white/70">Get started with 6 free AI credits. No credit card required.</p>
          <Button asChild size="lg" className="mt-8 rounded-full bg-black dark:bg-white text-white dark:text-black hover:bg-black/90 dark:hover:bg-white/90">
            <Link href="/dashboard">
              Get Started Free <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
