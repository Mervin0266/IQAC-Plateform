import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Award, Users, Building, BookOpen, TrendingUp, Star, CheckCircle, Briefcase } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';

interface CentreExcellencePageProps {
  onNavigate: (page: string) => void;
  isPublicView?: boolean;
}

export function CentreExcellencePage({ onNavigate, isPublicView = false }: CentreExcellencePageProps) {
  const [selectedCentre, setSelectedCentre] = useState<string | null>(null);

  // Centres of Excellence Data
  const centres = [
    {
      id: 'COE-001',
      name: 'Centre for Artificial Intelligence and Machine Learning',
      shortName: 'CAIML',
      head: 'Dr. Rajesh Kumar',
      established: '2020-06-15',
      focusAreas: ['Deep Learning', 'Natural Language Processing', 'Computer Vision', 'Reinforcement Learning'],
      infrastructure: {
        labs: ['AI Research Lab', 'ML Computing Lab', 'Vision Processing Lab'],
        equipment: [
          'High-Performance GPU Clusters (NVIDIA A100)',
          'Workstations with RTX 4090',
          'Edge Computing Devices',
          'IoT Sensor Networks'
        ],
        software: ['TensorFlow', 'PyTorch', 'CUDA Toolkit', 'Scikit-learn', 'OpenCV']
      },
      faculty: [
        { name: 'Dr. Rajesh Kumar', designation: 'Professor & Head', expertise: 'Deep Learning, Computer Vision' },
        { name: 'Dr. Priya Sharma', designation: 'Associate Professor', expertise: 'NLP, Text Analytics' },
        { name: 'Dr. Arun Menon', designation: 'Assistant Professor', expertise: 'Reinforcement Learning, Robotics' },
        { name: 'Dr. Deepa Singh', designation: 'Assistant Professor', expertise: 'Neural Networks, AI Ethics' },
      ],
      achievements: [
        '15+ Research Papers in Top-tier Conferences',
        '3 Patents Filed in AI Domain',
        '50+ Industry Collaborations',
        'Trained 200+ Students in AI/ML'
      ],
      projects: 12,
      publications: 25,
      funding: '₹2.5 Crore'
    },
    {
      id: 'COE-002',
      name: 'Centre for Sustainable Infrastructure Development',
      shortName: 'CSID',
      head: 'Dr. Suresh Rao',
      established: '2019-08-20',
      focusAreas: ['Green Building Design', 'Smart Cities', 'Sustainable Materials', 'Water Management'],
      infrastructure: {
        labs: ['Structural Testing Lab', 'Environmental Engineering Lab', 'Geotechnical Lab'],
        equipment: [
          'Universal Testing Machine (2000 kN)',
          'Concrete Compression Testing Machine',
          'Soil Testing Equipment',
          'Water Quality Analysis Systems'
        ],
        software: ['STAAD Pro', 'ETABS', 'AutoCAD', 'Revit', 'ANSYS']
      },
      faculty: [
        { name: 'Dr. Suresh Rao', designation: 'Professor & Head', expertise: 'Sustainable Construction, Green Buildings' },
        { name: 'Dr. Meera Nair', designation: 'Associate Professor', expertise: 'Smart Cities, Urban Planning' },
        { name: 'Dr. Ramesh Kumar', designation: 'Assistant Professor', expertise: 'Environmental Engineering' },
      ],
      achievements: [
        '10+ Consultancy Projects with Government',
        '5 Patents in Sustainable Materials',
        '30+ Research Publications',
        'Collaborated with 20+ Municipal Corporations'
      ],
      projects: 18,
      publications: 32,
      funding: '₹3.2 Crore'
    },
    {
      id: 'COE-003',
      name: 'Centre for Renewable Energy and Power Systems',
      shortName: 'CREPS',
      head: 'Dr. Lakshmi Prasad',
      established: '2021-01-10',
      focusAreas: ['Solar Energy', 'Wind Power', 'Energy Storage', 'Smart Grid Technology'],
      infrastructure: {
        labs: ['Solar Energy Lab', 'Power Electronics Lab', 'Smart Grid Lab'],
        equipment: [
          'Solar Panel Testing Systems',
          'Power Quality Analyzers',
          'Battery Energy Storage Systems',
          'Grid Simulators'
        ],
        software: ['MATLAB Simulink', 'PSCAD', 'HOMER Pro', 'PVsyst']
      },
      faculty: [
        { name: 'Dr. Lakshmi Prasad', designation: 'Professor & Head', expertise: 'Solar Energy, Power Systems' },
        { name: 'Dr. Sunil Kumar', designation: 'Associate Professor', expertise: 'Wind Energy, Grid Integration' },
        { name: 'Dr. Vikram Patel', designation: 'Assistant Professor', expertise: 'Energy Storage, Batteries' },
      ],
      achievements: [
        '8+ Government Funded Projects',
        '20+ Industry Partnerships',
        '25+ Research Papers',
        'Developed 5MW Solar Farm Model'
      ],
      projects: 10,
      publications: 28,
      funding: '₹2.8 Crore'
    },
    {
      id: 'COE-004',
      name: 'Centre for Advanced Manufacturing and Automation',
      shortName: 'CAMA',
      head: 'Dr. Karthik Iyer',
      established: '2020-09-01',
      focusAreas: ['Additive Manufacturing', 'Robotics', 'Industry 4.0', 'Automation'],
      infrastructure: {
        labs: ['3D Printing Lab', 'Robotics Lab', 'CNC Machining Lab', 'Automation Lab'],
        equipment: [
          '3D Printers (FDM, SLA, SLS)',
          'Industrial Robots (6-axis)',
          'CNC Machines',
          'PLCs and SCADA Systems'
        ],
        software: ['SolidWorks', 'Fusion 360', 'RobotStudio', 'LabVIEW']
      },
      faculty: [
        { name: 'Dr. Karthik Iyer', designation: 'Professor & Head', expertise: 'Additive Manufacturing, Materials' },
        { name: 'Dr. Anita Kumar', designation: 'Associate Professor', expertise: 'Robotics, Automation' },
        { name: 'Dr. Prakash Sharma', designation: 'Assistant Professor', expertise: 'Industry 4.0, IoT' },
      ],
      achievements: [
        '12+ Industry Collaborations',
        '4 Patents in Manufacturing',
        '18+ Research Publications',
        'Trained 150+ Students in Advanced Manufacturing'
      ],
      projects: 15,
      publications: 22,
      funding: '₹2.2 Crore'
    },
  ];

  // Statistics
  const stats = {
    totalCentres: centres.length,
    totalFaculty: centres.reduce((sum, c) => sum + c.faculty.length, 0),
    totalProjects: centres.reduce((sum, c) => sum + c.projects, 0),
    totalPublications: centres.reduce((sum, c) => sum + c.publications, 0),
  };

  if (isPublicView) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Hero Banner */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 text-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center space-x-4 mb-4">
              <Award className="w-12 h-12" />
              <div>
                <h1 className="text-4xl font-bold">Centre of Excellence</h1>
                <p className="text-indigo-100 mt-2">Specialized research centers driving innovation</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Stats Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
            <Card className="border-l-4 border-l-indigo-500">
              <CardHeader>
                <CardDescription className="text-xs">Total Centres</CardDescription>
                <CardTitle className="text-3xl font-bold text-indigo-600">{stats.totalCentres}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="border-l-4 border-l-indigo-500">
              <CardHeader>
                <CardDescription className="text-xs">Faculty Members</CardDescription>
                <CardTitle className="text-3xl font-bold text-indigo-600">{stats.totalFaculty}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="border-l-4 border-l-indigo-500">
              <CardHeader>
                <CardDescription className="text-xs">Active Projects</CardDescription>
                <CardTitle className="text-3xl font-bold text-indigo-600">{stats.totalProjects}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="border-l-4 border-l-indigo-500">
              <CardHeader>
                <CardDescription className="text-xs">Publications</CardDescription>
                <CardTitle className="text-3xl font-bold text-indigo-600">{stats.totalPublications}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          {/* Centres - Summary Cards */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Centres of Excellence</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {centres.map((centre) => (
                <Card
                  key={centre.id}
                  className="border-l-4 border-l-indigo-500 hover:-translate-y-1 transition-transform shadow-sm hover:shadow-lg"
                >
                  <CardHeader>
                    <div className="flex items-start space-x-2 mb-2">
                      <Star className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                      <CardTitle className="text-lg leading-tight">{centre.shortName}</CardTitle>
                    </div>
                    <CardDescription className="text-sm">Specialized research and development center</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      <Badge variant="secondary" className="text-xs">{centre.funding}</Badge>
                      <Badge variant="secondary" className="text-xs">{centre.projects} projects</Badge>
                      <Badge variant="secondary" className="text-xs">{centre.publications} papers</Badge>
                    </div>
                    <p className="text-sm text-gray-600">Est. {new Date(centre.established).getFullYear()}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar currentPage="centre-excellence" onNavigate={onNavigate} />
      <main className="ml-64 p-8">
        <div className="p-6">
          {/* Page Title */}
          <div className="mb-8">
            <h1 className="text-2xl font-medium text-gray-900 mb-2">Centre of Excellence</h1>
            <p className="text-gray-600">
              Track specialized research centers and centers of excellence initiatives
            </p>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="border-l-4 border-l-blue-600">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardDescription>Total Centres</CardDescription>
                  <Building className="w-5 h-5 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">{stats.totalCentres}</div>
                <p className="text-xs text-gray-500 mt-1">Active centres</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-600">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardDescription>Faculty Members</CardDescription>
                  <Users className="w-5 h-5 text-green-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">{stats.totalFaculty}</div>
                <p className="text-xs text-gray-500 mt-1">Across all centres</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-orange-600">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardDescription>Active Projects</CardDescription>
                  <Briefcase className="w-5 h-5 text-orange-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">{stats.totalProjects}</div>
                <p className="text-xs text-gray-500 mt-1">Research projects</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-600">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardDescription>Publications</CardDescription>
                  <BookOpen className="w-5 h-5 text-purple-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">{stats.totalPublications}</div>
                <p className="text-xs text-gray-500 mt-1">Research papers</p>
              </CardContent>
            </Card>
          </div>

          {/* Centres Overview */}
          <div className="space-y-6">
            {centres.map((centre) => (
              <Card key={centre.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Award className="w-6 h-6 text-blue-600" />
                        <CardTitle className="text-2xl">{centre.name}</CardTitle>
                      </div>
                      <CardDescription className="text-base">
                        {centre.shortName} • Established {new Date(centre.established).getFullYear()}
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="bg-blue-50">
                      {centre.funding}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="overview" className="space-y-4">
                    <TabsList>
                      <TabsTrigger value="overview">Overview</TabsTrigger>
                      <TabsTrigger value="faculty">Faculty</TabsTrigger>
                      <TabsTrigger value="infrastructure">Infrastructure</TabsTrigger>
                      <TabsTrigger value="achievements">Achievements</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-semibold mb-3 flex items-center">
                            <Users className="w-4 h-4 mr-2 text-blue-600" />
                            Centre Head
                          </h4>
                          <p className="text-gray-700">{centre.head}</p>
                        </div>
                        <div>
                          <h4 className="font-semibold mb-3 flex items-center">
                            <TrendingUp className="w-4 h-4 mr-2 text-green-600" />
                            Statistics
                          </h4>
                          <div className="space-y-1 text-sm">
                            <p className="text-gray-700">Projects: <span className="font-semibold">{centre.projects}</span></p>
                            <p className="text-gray-700">Publications: <span className="font-semibold">{centre.publications}</span></p>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-3">Focus Areas</h4>
                        <div className="flex flex-wrap gap-2">
                          {centre.focusAreas.map((area, idx) => (
                            <Badge key={idx} variant="outline" className="bg-purple-50">
                              {area}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="faculty" className="space-y-3">
                      {centre.faculty.map((member, idx) => (
                        <Card key={idx} className="bg-gray-50">
                          <CardContent className="pt-4">
                            <div className="flex items-start gap-4">
                              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                                {member.name.split(' ').map(n => n[0]).join('')}
                              </div>
                              <div className="flex-1">
                                <h5 className="font-semibold text-gray-900">{member.name}</h5>
                                <p className="text-sm text-gray-600 mb-1">{member.designation}</p>
                                <p className="text-sm text-gray-500">
                                  <span className="font-medium">Expertise:</span> {member.expertise}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </TabsContent>

                    <TabsContent value="infrastructure" className="space-y-4">
                      <div>
                        <h4 className="font-semibold mb-3">Laboratories</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {centre.infrastructure.labs.map((lab, idx) => (
                            <Badge key={idx} variant="outline" className="bg-blue-50 justify-start">
                              <Building className="w-3 h-3 mr-1" />
                              {lab}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-3">Major Equipment</h4>
                        <ul className="space-y-2">
                          {centre.infrastructure.equipment.map((equip, idx) => (
                            <li key={idx} className="flex items-start">
                              <CheckCircle className="w-4 h-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                              <span className="text-gray-700">{equip}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-3">Software & Tools</h4>
                        <div className="flex flex-wrap gap-2">
                          {centre.infrastructure.software.map((software, idx) => (
                            <Badge key={idx} variant="outline" className="bg-green-50">
                              {software}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="achievements" className="space-y-2">
                      {centre.achievements.map((achievement, idx) => (
                        <div key={idx} className="flex items-start p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                          <Star className="w-5 h-5 text-yellow-600 mr-3 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-700">{achievement}</span>
                        </div>
                      ))}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}