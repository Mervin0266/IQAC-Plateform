import React, { useState, useEffect, useRef } from 'react';
import { Award, BookOpen, TrendingUp, Briefcase, Users, Building, Globe, Target, ChevronRight, CheckCircle, Star, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

interface PublicHomePageProps {
  onNavigate: (section: string) => void;
}

export function PublicHomePage({ onNavigate }: PublicHomePageProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isStatsVisible, setIsStatsVisible] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);

  const heroImages = [
    'https://images.unsplash.com/photo-1562774053-701939374585?w=1600&q=80',
    'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1600&q=80',
    'https://images.unsplash.com/photo-1607237138185-eedd9c632b0b?w=1600&q=80',
    'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=1600&q=80'
  ];

  // Hero slideshow
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % heroImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Intersection Observer for stats animation
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsStatsVisible(true);
          }
        });
      },
      { threshold: 0.2 }
    );

    if (statsRef.current) {
      observer.observe(statsRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Animated counter hook
  const useCounter = (end: number, duration: number = 2000) => {
    const [count, setCount] = useState(0);

    useEffect(() => {
      if (!isStatsVisible) return;

      let startTime: number;
      const step = (timestamp: number) => {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / duration, 1);
        setCount(Math.floor(progress * end));
        if (progress < 1) {
          requestAnimationFrame(step);
        }
      };
      requestAnimationFrame(step);
    }, [isStatsVisible, end, duration]);

    return count;
  };

  const researchCount = useCounter(312);
  const patentsCount = useCounter(48);
  const placementRate = useCounter(92);
  const partnersCount = useCounter(186);
  const mouCount = useCounter(24);

  const quickLinks = [
    { icon: Award, label: 'Achievements', key: 'achievements', color: 'bg-blue-500' },
    { icon: BookOpen, label: 'Research & Innovation', key: 'research-innovation', color: 'bg-purple-500' },
    { icon: TrendingUp, label: 'Rankings', key: 'rankings', color: 'bg-green-500' },
    { icon: Users, label: 'Placements', key: 'placements-internships', color: 'bg-orange-500' },
    { icon: Building, label: 'Infrastructure', key: 'infrastructure', color: 'bg-red-500' },
    { icon: Globe, label: 'International', key: 'international-interactions', color: 'bg-cyan-500' },
    { icon: Star, label: 'Centre of Excellence', key: 'centre-excellence', color: 'bg-indigo-500' },
    { icon: Briefcase, label: 'Industry Connects', key: 'industry-connects', color: 'bg-teal-500' }
  ];

  const latestNews = [
    {
      title: 'NAAC A++ Accreditation Renewed',
      description: 'Christ University maintains its NAAC A++ accreditation with highest CGPA score.',
      date: '2024-03-15',
      category: 'Accreditation'
    },
    {
      title: 'Research Excellence Award 2024',
      description: 'Faculty members receive prestigious research grants totaling ₹5 Crore.',
      date: '2024-03-10',
      category: 'Research'
    },
    {
      title: 'International Partnership Signed',
      description: 'New MoU with Oxford University for collaborative research programs.',
      date: '2024-03-05',
      category: 'International'
    },
    {
      title: '100% Placement Achievement',
      description: 'Engineering batch 2024 achieves 100% placement with top companies.',
      date: '2024-02-28',
      category: 'Placements'
    }
  ];

  return (
    <div className="w-full">
      {/* Hero Section with Slideshow */}
      <section className="relative h-screen w-full overflow-hidden">
        {/* Gold left edge bar */}
        <div className="absolute left-0 top-0 bottom-0 w-[5px] bg-[#e8c84a] z-20" />

        {/* Slideshow backgrounds */}
        {heroImages.map((image, index) => (
          <div
            key={index}
            className="absolute inset-0 transition-opacity duration-[1200ms]"
            style={{
              opacity: index === currentImageIndex ? 1 : 0,
              backgroundImage: `url(${image})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          />
        ))}

        {/* Gradient overlay */}
        <div
          className="absolute inset-0 z-10"
          style={{
            background: 'linear-gradient(to bottom, rgba(10,16,60,0.88), rgba(10,16,60,0.6))'
          }}
        />

        {/* Content */}
        <div className="relative z-10 h-full flex flex-col items-center justify-center text-white px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1
              className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight"
              style={{
                animation: 'fadeSlideIn 0.8s ease-out 0s both'
              }}
            >
              Internal Quality Assurance Cell
            </h1>
            <p
              className="text-xl md:text-2xl text-blue-100 mb-4 font-medium"
              style={{
                animation: 'fadeSlideIn 0.8s ease-out 0.15s both'
              }}
            >
              Christ University — Committed to Excellence in Education
            </p>
            <p
              className="text-lg text-blue-200 max-w-3xl mx-auto leading-relaxed"
              style={{
                animation: 'fadeSlideIn 0.8s ease-out 0.3s both'
              }}
            >
              The IQAC at Christ University is dedicated to ensuring quality enhancement through systematic planning,
              implementation, and monitoring of academic and administrative activities.
            </p>
          </div>

          {/* Dot indicators */}
          <div
            className="flex space-x-2 mt-12"
            style={{
              animation: 'fadeSlideIn 0.8s ease-out 0.45s both'
            }}
          >
            {heroImages.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentImageIndex(index)}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  index === currentImageIndex
                    ? 'bg-[#e8c84a] w-8'
                    : 'bg-white/50 hover:bg-white/80'
                }`}
              />
            ))}
          </div>

          {/* Bouncing scroll cue */}
          <div className="absolute bottom-8 animate-bounce">
            <ChevronDown className="w-8 h-8 text-white/80" />
          </div>
        </div>
      </section>

      {/* Animated Stats Bar */}
      <section ref={statsRef} className="bg-[#0f1746] text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold mb-2 text-[#e8c84a]">
                {researchCount}+
              </div>
              <div className="text-sm text-blue-200">Research Papers</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold mb-2 text-[#e8c84a]">
                {patentsCount}
              </div>
              <div className="text-sm text-blue-200">Patents Filed</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold mb-2 text-[#e8c84a]">
                {placementRate}%
              </div>
              <div className="text-sm text-blue-200">Placement Rate</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold mb-2 text-[#e8c84a]">
                {partnersCount}+
              </div>
              <div className="text-sm text-blue-200">Industry Partners</div>
            </div>
            <div className="text-center col-span-2 md:col-span-1">
              <div className="text-3xl md:text-4xl font-bold mb-2 text-[#e8c84a]">
                {mouCount}
              </div>
              <div className="text-sm text-blue-200">International MoUs</div>
            </div>
          </div>
        </div>
      </section>

      {/* NAAC & NBA Accreditation Status */}
      <FadeInSection>
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Accreditation Status</h2>
              <p className="text-lg text-gray-600">Our commitment to quality recognized by national accreditation bodies</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* NAAC Card */}
              <Card className="border-2 border-[#2f4692] shadow-lg hover:-translate-y-1 transition-transform duration-300">
                <CardHeader className="bg-gradient-to-r from-[#2f4692] to-[#243a7a] text-white">
                  <CardTitle className="text-2xl">NAAC Accreditation</CardTitle>
                  <CardDescription className="text-blue-100">
                    National Assessment and Accreditation Council
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 font-medium">Grade:</span>
                      <span className="text-2xl font-bold text-green-600">A++</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 font-medium">CGPA:</span>
                      <span className="text-2xl font-bold text-[#2f4692]">3.69</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 font-medium">Valid Until:</span>
                      <span className="text-lg font-semibold text-gray-700">2028</span>
                    </div>
                    <div className="pt-4 border-t">
                      <div className="flex items-start space-x-2">
                        <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-gray-600">
                          Highest accreditation grade demonstrating excellence in teaching, learning, research, and governance.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* NBA Card */}
              <Card className="border-2 border-[#2f4692] shadow-lg hover:-translate-y-1 transition-transform duration-300">
                <CardHeader className="bg-gradient-to-r from-[#2f4692] to-[#243a7a] text-white">
                  <CardTitle className="text-2xl">NBA Accreditation</CardTitle>
                  <CardDescription className="text-blue-100">
                    National Board of Accreditation
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 font-medium">Programs Accredited:</span>
                      <span className="text-2xl font-bold text-[#2f4692]">8</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 font-medium">Compliance Rate:</span>
                      <span className="text-2xl font-bold text-green-600">97%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 font-medium">Status:</span>
                      <span className="text-lg font-semibold text-green-600 flex items-center">
                        <CheckCircle className="w-5 h-5 mr-1" /> Active
                      </span>
                    </div>
                    <div className="pt-4 border-t">
                      <div className="flex items-start space-x-2">
                        <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-gray-600">
                          All engineering programs meet NBA quality standards ensuring industry-relevant curriculum and outcomes.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </FadeInSection>

      {/* Latest News & Events */}
      <FadeInSection>
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Latest News & Events</h2>
              <p className="text-lg text-gray-600">Stay updated with recent achievements and milestones</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {latestNews.map((news, index) => (
                <Card
                  key={index}
                  className="hover:shadow-lg transition-all cursor-pointer hover:-translate-y-1 duration-300"
                  style={{
                    animation: `fadeInUp 0.6s ease-out ${index * 0.06}s both`
                  }}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-[#2f4692] bg-blue-50 px-2 py-1 rounded">
                        {news.category}
                      </span>
                      <span className="text-xs text-gray-500">{news.date}</span>
                    </div>
                    <CardTitle className="text-lg leading-tight">{news.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 leading-relaxed">{news.description}</p>
                    <button className="mt-4 text-sm text-[#2f4692] font-medium flex items-center hover:underline">
                      Read More <ChevronRight className="w-4 h-4 ml-1" />
                    </button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </FadeInSection>

      {/* Quick Links */}
      <FadeInSection>
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Explore IQAC</h2>
              <p className="text-lg text-gray-600">Quick access to all major sections</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {quickLinks.map((link, index) => {
                const Icon = link.icon;
                return (
                  <button
                    key={link.key}
                    onClick={() => onNavigate(link.key)}
                    className="group bg-white rounded-lg p-6 shadow-md hover:shadow-xl transition-all transform hover:-translate-y-1"
                    style={{
                      animation: `fadeInUp 0.6s ease-out ${index * 0.06}s both`
                    }}
                  >
                    <div className={`${link.color} w-12 h-12 rounded-lg flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900 text-center">{link.label}</h3>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      </FadeInSection>

      {/* Call to Action */}
      <FadeInSection>
        <section className="bg-gradient-to-r from-[#2f4692] to-[#243a7a] text-white py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold mb-4">Quality is Our Commitment</h2>
            <p className="text-xl text-blue-100 mb-8">
              Join us in our mission to maintain and enhance educational excellence at Christ University
            </p>
            <button
              onClick={() => onNavigate('achievements')}
              className="bg-white text-[#2f4692] px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors inline-flex items-center"
            >
              Explore Our Achievements <ChevronRight className="w-5 h-5 ml-2" />
            </button>
          </div>
        </section>
      </FadeInSection>
    </div>
  );
}

// FadeInSection component using IntersectionObserver
function FadeInSection({ children }: { children: React.ReactNode }) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
          }
        });
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(28px)',
        transition: 'opacity 0.6s ease-out, transform 0.6s ease-out'
      }}
    >
      {children}
    </div>
  );
}
