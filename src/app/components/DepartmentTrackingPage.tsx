import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Card } from './ui/card';
import { ArrowLeft, Download, Filter, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';

interface DepartmentTrackingPageProps {
  onNavigate: (page: string) => void;
  departmentId: string;
}

// Mock data structure based on the Excel image
const departmentData: Record<string, any> = {
  'civil-engineering': {
    name: 'Civil Engineering',
    subThemes: [
      {
        ref: '1.1',
        name: 'Infrastructure Development',
        goals: [
          {
            id: 'GOAL 1',
            indicators: [
              {
                order: 1,
                description: 'Number of infrastructure projects completed with modern construction techniques',
                planned: 8,
                achieved: 6,
                remarks: 'In progress, 2 projects in final phase',
                planOfAction: 'Accelerate completion of remaining projects'
              },
              {
                order: 2,
                description: 'Percentage of students trained in BIM (Building Information Modeling) software',
                planned: 80,
                achieved: 72,
                remarks: 'Training sessions ongoing',
                planOfAction: 'Schedule additional workshops'
              },
              {
                order: 3,
                description: 'Number of industry collaborations for practical training',
                planned: 12,
                achieved: 10,
                remarks: '',
                planOfAction: ''
              }
            ]
          },
          {
            id: 'GOAL 2',
            indicators: [
              {
                order: 1,
                description: 'Number of sustainable construction practices implemented in curriculum',
                planned: 5,
                achieved: 5,
                remarks: 'Target achieved',
                planOfAction: 'Maintain and update practices'
              }
            ]
          }
        ]
      },
      {
        ref: '1.2',
        name: 'Structural Design Excellence',
        goals: [
          {
            id: 'GOAL 1',
            indicators: [
              {
                order: 1,
                description: 'Number of structural analysis software licenses acquired',
                planned: 50,
                achieved: 48,
                remarks: 'Nearly complete',
                planOfAction: 'Procure remaining 2 licenses'
              }
            ]
          }
        ]
      }
    ]
  },
  'electronics-communication-engineering': {
    name: 'Electronics and Communication Engineering',
    subThemes: [
      {
        ref: '2.1',
        name: 'Communication Systems',
        goals: [
          {
            id: 'GOAL 1',
            indicators: [
              {
                order: 1,
                description: 'Number of 5G and wireless communication labs established',
                planned: 3,
                achieved: 2,
                remarks: 'One lab under setup',
                planOfAction: 'Complete lab setup by next quarter'
              },
              {
                order: 2,
                description: 'Percentage of students certified in IoT technologies',
                planned: 70,
                achieved: 58,
                remarks: 'Certification drives ongoing',
                planOfAction: 'Increase awareness campaigns'
              }
            ]
          }
        ]
      },
      {
        ref: '2.2',
        name: 'VLSI Design',
        goals: [
          {
            id: 'GOAL 1',
            indicators: [
              {
                order: 1,
                description: 'Number of VLSI design tools and EDA software available',
                planned: 8,
                achieved: 7,
                remarks: '',
                planOfAction: ''
              },
              {
                order: 2,
                description: 'Number of chip design projects completed by students',
                planned: 15,
                achieved: 12,
                remarks: '3 projects in progress',
                planOfAction: 'Provide mentorship support'
              }
            ]
          }
        ]
      }
    ]
  },
  'electrical-electronics-engineering': {
    name: 'Electrical and Electronics Engineering',
    subThemes: [
      {
        ref: '3.1',
        name: 'Power Systems',
        goals: [
          {
            id: 'GOAL 1',
            indicators: [
              {
                order: 1,
                description: 'Number of power system simulation labs upgraded',
                planned: 4,
                achieved: 4,
                remarks: 'Target achieved',
                planOfAction: 'Maintain equipment'
              },
              {
                order: 2,
                description: 'Percentage of students trained in smart grid technologies',
                planned: 75,
                achieved: 68,
                remarks: 'Training in progress',
                planOfAction: 'Conduct additional training sessions'
              }
            ]
          }
        ]
      },
      {
        ref: '3.2',
        name: 'Renewable Energy',
        goals: [
          {
            id: 'GOAL 1',
            indicators: [
              {
                order: 1,
                description: 'Number of solar and wind energy projects implemented',
                planned: 6,
                achieved: 5,
                remarks: 'One project pending approval',
                planOfAction: 'Fast-track approval process'
              }
            ]
          }
        ]
      }
    ]
  },
  'mechanical-automobile-engineering': {
    name: 'Mechanical and Automobile Engineering',
    subThemes: [
      {
        ref: '4.1',
        name: 'Automotive Design',
        goals: [
          {
            id: 'GOAL 1',
            indicators: [
              {
                order: 1,
                description: 'Number of CAD/CAM software licenses for automotive design',
                planned: 60,
                achieved: 55,
                remarks: 'Additional licenses needed',
                planOfAction: 'Procure 5 more licenses'
              },
              {
                order: 2,
                description: 'Number of electric vehicle design projects initiated',
                planned: 4,
                achieved: 4,
                remarks: 'Target met',
                planOfAction: 'Continue innovation focus'
              }
            ]
          }
        ]
      },
      {
        ref: '4.2',
        name: 'Manufacturing Technology',
        goals: [
          {
            id: 'GOAL 1',
            indicators: [
              {
                order: 1,
                description: 'Number of CNC machines and 3D printers operational',
                planned: 10,
                achieved: 9,
                remarks: 'One machine under maintenance',
                planOfAction: 'Complete repairs'
              }
            ]
          }
        ]
      }
    ]
  },
  'computer-science-engineering': {
    name: 'Computer Science and Engineering',
    subThemes: [
      {
        ref: '5.1',
        name: 'Software Development',
        goals: [
          {
            id: 'GOAL 1',
            indicators: [
              {
                order: 1,
                description: 'Number of students with industry certifications (AWS, Azure, Google Cloud)',
                planned: 150,
                achieved: 142,
                remarks: 'Strong performance',
                planOfAction: 'Maintain certification drives'
              },
              {
                order: 2,
                description: 'Number of full-stack development projects completed',
                planned: 80,
                achieved: 75,
                remarks: '5 projects ongoing',
                planOfAction: 'Provide project support'
              }
            ]
          }
        ]
      },
      {
        ref: '5.2',
        name: 'Cloud Computing',
        goals: [
          {
            id: 'GOAL 1',
            indicators: [
              {
                order: 1,
                description: 'Number of cloud computing labs established',
                planned: 3,
                achieved: 3,
                remarks: 'Fully operational',
                planOfAction: 'Upgrade infrastructure as needed'
              }
            ]
          }
        ]
      }
    ]
  },
  'science-humanities-engineering': {
    name: 'Science and Humanities (Engg.)',
    subThemes: [
      {
        ref: '6.1',
        name: 'Applied Sciences',
        goals: [
          {
            id: 'GOAL 1',
            indicators: [
              {
                order: 1,
                description: 'Number of advanced physics and chemistry labs upgraded',
                planned: 5,
                achieved: 4,
                remarks: 'One lab upgrade pending',
                planOfAction: 'Complete by end of semester'
              },
              {
                order: 2,
                description: 'Percentage of students participating in science exhibitions',
                planned: 50,
                achieved: 42,
                remarks: 'Increase participation',
                planOfAction: 'Promote through student groups'
              }
            ]
          }
        ]
      },
      {
        ref: '6.2',
        name: 'Communication Skills',
        goals: [
          {
            id: 'GOAL 1',
            indicators: [
              {
                order: 1,
                description: 'Number of communication and soft skills workshops conducted',
                planned: 20,
                achieved: 16,
                remarks: '4 workshops scheduled',
                planOfAction: 'Execute scheduled workshops'
              }
            ]
          }
        ]
      }
    ]
  },
  'school-architecture': {
    name: 'School of Architecture',
    subThemes: [
      {
        ref: '7.1',
        name: 'Architectural Design',
        goals: [
          {
            id: 'GOAL 1',
            indicators: [
              {
                order: 1,
                description: 'Number of architectural design studios established',
                planned: 4,
                achieved: 3,
                remarks: 'One studio in final setup phase',
                planOfAction: 'Complete setup immediately'
              },
              {
                order: 2,
                description: 'Number of student design portfolios developed',
                planned: 100,
                achieved: 85,
                remarks: 'In progress',
                planOfAction: 'Mentor remaining students'
              }
            ]
          }
        ]
      },
      {
        ref: '7.2',
        name: 'Sustainable Design',
        goals: [
          {
            id: 'GOAL 1',
            indicators: [
              {
                order: 1,
                description: 'Number of green building design projects undertaken',
                planned: 8,
                achieved: 7,
                remarks: 'One project in planning',
                planOfAction: 'Finalize project plan'
              }
            ]
          }
        ]
      }
    ]
  },
  'ai-data-science': {
    name: 'Artificial Intelligence and Data Science',
    subThemes: [
      {
        ref: '8.1',
        name: 'Machine Learning',
        goals: [
          {
            id: 'GOAL 1',
            indicators: [
              {
                order: 1,
                description: 'Number of ML/AI labs with GPU infrastructure',
                planned: 3,
                achieved: 3,
                remarks: 'Fully equipped',
                planOfAction: 'Maintain and upgrade regularly'
              },
              {
                order: 2,
                description: 'Number of students completing ML certification courses',
                planned: 120,
                achieved: 115,
                remarks: 'Excellent progress',
                planOfAction: 'Continue momentum'
              }
            ]
          }
        ]
      },
      {
        ref: '8.2',
        name: 'Big Data Analytics',
        goals: [
          {
            id: 'GOAL 1',
            indicators: [
              {
                order: 1,
                description: 'Number of big data projects using Hadoop/Spark frameworks',
                planned: 25,
                achieved: 23,
                remarks: '2 projects ongoing',
                planOfAction: 'Support project completion'
              }
            ]
          }
        ]
      }
    ]
  }
};

export function DepartmentTrackingPage({ onNavigate, departmentId }: DepartmentTrackingPageProps) {
  const [selectedSubTheme, setSelectedSubTheme] = useState<string | null>(null);
  let department = departmentData[departmentId];

  if (!department) {
    const formattedName = departmentId.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    department = {
      ...departmentData['computer-science-engineering'],
      name: formattedName.length > 30 ? 'New Department' : formattedName
    };
  }

  const calculateProgress = (planned: number, achieved: number) => {
    return Math.min(Math.round((achieved / planned) * 100), 100);
  };

  const getStatusBadge = (percentage: number) => {
    if (percentage >= 90) {
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100"><CheckCircle2 className="w-3 h-3 mr-1" />Excellent</Badge>;
    } else if (percentage >= 70) {
      return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100"><Clock className="w-3 h-3 mr-1" />On Track</Badge>;
    } else {
      return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100"><AlertCircle className="w-3 h-3 mr-1" />Needs Attention</Badge>;
    }
  };

  // Calculate overall stats
  let totalIndicators = 0;
  let totalPlanned = 0;
  let totalAchieved = 0;

  department.subThemes.forEach((subTheme: any) => {
    subTheme.goals.forEach((goal: any) => {
      goal.indicators.forEach((indicator: any) => {
        totalIndicators++;
        totalPlanned += indicator.planned;
        totalAchieved += indicator.achieved;
      });
    });
  });

  const overallProgress = Math.round((totalAchieved / totalPlanned) * 100);

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar currentPage="strategic-plan" onNavigate={onNavigate} />
      <main className="ml-64 p-8">
        {/* Back Button */}
        <button
          onClick={() => onNavigate('strategic-plan')}
          className="flex items-center text-blue-600 hover:text-blue-700 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Strategic Plan
        </button>

        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-medium text-gray-900 mb-2">{department.name}</h1>
          <p className="text-gray-600">Track performance indicators and strategic objectives</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <p className="text-sm text-gray-600 mb-2">Overall Progress</p>
            <p className="text-3xl font-semibold text-gray-900 mb-3">{overallProgress}%</p>
            <Progress value={overallProgress} className="h-2" />
          </Card>

          <Card className="p-6">
            <p className="text-sm text-gray-600 mb-2">Total Indicators</p>
            <p className="text-3xl font-semibold text-gray-900">{totalIndicators}</p>
            <p className="text-sm text-gray-500 mt-2">Across {department.subThemes.length} sub-themes</p>
          </Card>

          <Card className="p-6">
            <p className="text-sm text-gray-600 mb-2">Total Planned</p>
            <p className="text-3xl font-semibold text-gray-900">{totalPlanned}</p>
            <p className="text-sm text-gray-500 mt-2">Target units</p>
          </Card>

          <Card className="p-6">
            <p className="text-sm text-gray-600 mb-2">Total Achieved</p>
            <p className="text-3xl font-semibold text-gray-900">{totalAchieved}</p>
            <p className="text-sm text-gray-500 mt-2">Completed units</p>
          </Card>
        </div>

        {/* Sub-themes Tabs */}
        <div className="mb-6">
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant={selectedSubTheme === null ? "default" : "outline"}
              onClick={() => setSelectedSubTheme(null)}
              className={selectedSubTheme === null ? "bg-blue-600 hover:bg-blue-700" : ""}
            >
              All Sub-themes
            </Button>
            {department.subThemes.map((subTheme: any) => (
              <Button
                key={subTheme.ref}
                variant={selectedSubTheme === subTheme.ref ? "default" : "outline"}
                onClick={() => setSelectedSubTheme(subTheme.ref)}
                className={selectedSubTheme === subTheme.ref ? "bg-blue-600 hover:bg-blue-700" : ""}
              >
                {subTheme.ref} - {subTheme.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Tracking Table */}
        <Card className="overflow-hidden">
          <div className="p-6 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">Performance Indicators</h2>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="w-24">Sub Theme</TableHead>
                  <TableHead className="w-24">Goal</TableHead>
                  <TableHead className="w-12">PI #</TableHead>
                  <TableHead className="min-w-[300px]">Performance Indicator</TableHead>
                  <TableHead className="w-24 text-center">Planned</TableHead>
                  <TableHead className="w-24 text-center">Achieved</TableHead>
                  <TableHead className="w-32 text-center">Achievement %</TableHead>
                  <TableHead className="w-32 text-center">Status</TableHead>
                  <TableHead className="min-w-[200px]">Remarks</TableHead>
                  <TableHead className="min-w-[200px]">Plan of Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {department.subThemes
                  .filter((st: any) => selectedSubTheme === null || st.ref === selectedSubTheme)
                  .map((subTheme: any) =>
                    subTheme.goals.map((goal: any) =>
                      goal.indicators.map((indicator: any, idx: number) => {
                        const percentage = calculateProgress(indicator.planned, indicator.achieved);
                        return (
                          <TableRow key={`${subTheme.ref}-${goal.id}-${idx}`} className="hover:bg-gray-50">
                            <TableCell className="font-medium">{subTheme.ref}</TableCell>
                            <TableCell className="font-medium">{goal.id}</TableCell>
                            <TableCell className="text-center">{indicator.order}</TableCell>
                            <TableCell>{indicator.description}</TableCell>
                            <TableCell className="text-center font-medium">{indicator.planned}</TableCell>
                            <TableCell className="text-center font-medium">{indicator.achieved}</TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="text-center font-medium text-sm">{percentage}%</div>
                                <Progress value={percentage} className="h-1.5" />
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              {getStatusBadge(percentage)}
                            </TableCell>
                            <TableCell className="text-sm text-gray-600">
                              {indicator.remarks || '-'}
                            </TableCell>
                            <TableCell className="text-sm text-gray-600">
                              {indicator.planOfAction || '-'}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )
                  )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </main>
    </div>
  );
}