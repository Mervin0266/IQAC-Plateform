import React from 'react';
import { Sidebar } from './Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Layers, Building2, Cpu, Microscope, Calendar, DollarSign, TrendingUp } from 'lucide-react';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

interface InfrastructureFacilitiesPageProps {
  onNavigate: (page: string) => void;
  isPublicView?: boolean;
}

export function InfrastructureFacilitiesPage({ onNavigate, isPublicView = false }: InfrastructureFacilitiesPageProps) {
  const departmentInfrastructure = [
    {
      department: 'Computer Science and Engineering',
      labs: [
        {
          name: 'AI & Machine Learning Lab',
          newEquipments: [
            { item: 'NVIDIA RTX 4090 GPU Workstations', quantity: 15, value: '₹45 Lakhs', acquired: '2024-01-15' },
            { item: 'High-Performance Computing Cluster', quantity: 1, value: '₹1.2 Crores', acquired: '2023-12-10' },
            { item: 'Deep Learning Development Kits', quantity: 25, value: '₹12 Lakhs', acquired: '2024-02-20' },
          ],
          totalValue: '₹1.77 Crores',
          capacity: 60,
        },
        {
          name: 'Cloud Computing & IoT Lab',
          newEquipments: [
            { item: 'Raspberry Pi 4 Development Kits', quantity: 50, value: '₹8 Lakhs', acquired: '2024-01-05' },
            { item: 'IoT Sensor Modules & Gateways', quantity: 100, value: '₹15 Lakhs', acquired: '2023-11-20' },
            { item: 'Cloud Infrastructure (AWS Credits)', quantity: 1, value: '₹20 Lakhs', acquired: '2024-03-01' },
          ],
          totalValue: '₹43 Lakhs',
          capacity: 50,
        },
      ],
    },
    {
      department: 'Electronics and Communication Engineering',
      labs: [
        {
          name: 'VLSI Design Lab',
          newEquipments: [
            { item: 'Cadence VLSI Design Suite Licenses', quantity: 30, value: '₹25 Lakhs', acquired: '2024-02-10' },
            { item: 'FPGA Development Boards (Xilinx)', quantity: 40, value: '₹18 Lakhs', acquired: '2023-12-05' },
            { item: 'Mixed Signal Oscilloscopes', quantity: 15, value: '₹22 Lakhs', acquired: '2024-01-20' },
          ],
          totalValue: '₹65 Lakhs',
          capacity: 40,
        },
        {
          name: 'Communication Systems Lab',
          newEquipments: [
            { item: 'Software Defined Radio Kits', quantity: 20, value: '₹16 Lakhs', acquired: '2024-02-15' },
            { item: 'Network Analyzers', quantity: 8, value: '₹28 Lakhs', acquired: '2023-11-25' },
            { item: '5G Testing Equipment', quantity: 5, value: '₹45 Lakhs', acquired: '2024-03-10' },
          ],
          totalValue: '₹89 Lakhs',
          capacity: 50,
        },
      ],
    },
    {
      department: 'Electrical and Electronics Engineering',
      labs: [
        {
          name: 'Power Systems Lab',
          newEquipments: [
            { item: 'Smart Grid Simulation Systems', quantity: 5, value: '₹35 Lakhs', acquired: '2024-01-25' },
            { item: 'Digital Power Analyzers', quantity: 10, value: '₹18 Lakhs', acquired: '2023-12-15' },
            { item: 'Renewable Energy Test Bench', quantity: 3, value: '₹22 Lakhs', acquired: '2024-02-05' },
          ],
          totalValue: '₹75 Lakhs',
          capacity: 40,
        },
        {
          name: 'Control Systems & Automation Lab',
          newEquipments: [
            { item: 'Industrial PLCs (Siemens S7-1500)', quantity: 12, value: '₹24 Lakhs', acquired: '2024-01-10' },
            { item: 'SCADA System Setup', quantity: 2, value: '₹32 Lakhs', acquired: '2023-11-30' },
            { item: 'Servo Motor Drive Systems', quantity: 15, value: '₹16 Lakhs', acquired: '2024-02-20' },
          ],
          totalValue: '₹72 Lakhs',
          capacity: 45,
        },
      ],
    },
    {
      department: 'Mechanical and Automobile Engineering',
      labs: [
        {
          name: 'CAD/CAM Lab',
          newEquipments: [
            { item: 'SolidWorks Premium Licenses', quantity: 50, value: '₹20 Lakhs', acquired: '2024-01-15' },
            { item: '3D Printers (Industrial Grade)', quantity: 5, value: '₹35 Lakhs', acquired: '2023-12-20' },
            { item: 'CNC Milling Machines', quantity: 3, value: '₹48 Lakhs', acquired: '2024-02-10' },
          ],
          totalValue: '₹1.03 Crores',
          capacity: 50,
        },
        {
          name: 'Automobile Engineering Lab',
          newEquipments: [
            { item: 'Engine Testing Dynamometer', quantity: 1, value: '₹45 Lakhs', acquired: '2024-01-05' },
            { item: 'Vehicle Diagnostic Equipment', quantity: 8, value: '₹16 Lakhs', acquired: '2023-11-15' },
            { item: 'Electric Vehicle Simulator', quantity: 2, value: '₹28 Lakhs', acquired: '2024-03-01' },
          ],
          totalValue: '₹89 Lakhs',
          capacity: 40,
        },
      ],
    },
    {
      department: 'Civil Engineering',
      labs: [
        {
          name: 'Structural Engineering Lab',
          newEquipments: [
            { item: 'Universal Testing Machine (2000 kN)', quantity: 2, value: '₹55 Lakhs', acquired: '2024-02-01' },
            { item: 'Non-Destructive Testing Equipment', quantity: 1, value: '₹18 Lakhs', acquired: '2024-01-10' },
            { item: 'Concrete Compression Testing Machine', quantity: 3, value: '₹12 Lakhs', acquired: '2023-12-05' },
          ],
          totalValue: '₹85 Lakhs',
          capacity: 35,
        },
        {
          name: 'Environmental Engineering Lab',
          newEquipments: [
            { item: 'Water Quality Analysis Systems', quantity: 5, value: '₹22 Lakhs', acquired: '2024-01-20' },
            { item: 'Air Pollution Monitoring Kits', quantity: 8, value: '₹16 Lakhs', acquired: '2023-11-25' },
            { item: 'Soil Testing Equipment', quantity: 10, value: '₹14 Lakhs', acquired: '2024-02-15' },
          ],
          totalValue: '₹52 Lakhs',
          capacity: 40,
        },
      ],
    },
    {
      department: 'Artificial Intelligence and Data Science',
      labs: [
        {
          name: 'Data Science Lab',
          newEquipments: [
            { item: 'High-End Data Analytics Workstations', quantity: 40, value: '₹80 Lakhs', acquired: '2024-01-12' },
            { item: 'Big Data Processing Cluster', quantity: 1, value: '₹95 Lakhs', acquired: '2023-12-18' },
            { item: 'Data Visualization Tools Suite', quantity: 50, value: '₹15 Lakhs', acquired: '2024-02-08' },
          ],
          totalValue: '₹1.90 Crores',
          capacity: 60,
        },
      ],
    },
  ];

  const totalInvestment = departmentInfrastructure.reduce((total, dept) => {
    const deptTotal = dept.labs.reduce((sum, lab) => {
      const labValue = parseFloat(lab.totalValue.replace(/[₹,\sLakhsCrores]/g, ''));
      const multiplier = lab.totalValue.includes('Crores') ? 100 : 1;
      return sum + (labValue * multiplier);
    }, 0);
    return total + deptTotal;
  }, 0);

  const totalLabs = departmentInfrastructure.reduce((total, dept) => total + dept.labs.length, 0);
  const totalEquipments = departmentInfrastructure.reduce((total, dept) => {
    return total + dept.labs.reduce((sum, lab) => sum + lab.newEquipments.length, 0);
  }, 0);

  if (isPublicView) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Hero Banner */}
        <div className="bg-gradient-to-r from-red-600 to-red-500 text-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center space-x-4 mb-4">
              <Layers className="w-12 h-12" />
              <div>
                <h1 className="text-4xl font-bold">Infrastructure & Facilities</h1>
                <p className="text-red-100 mt-2">State-of-the-art laboratories and research facilities</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Stats Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
            <Card className="border-l-4 border-l-red-500">
              <CardHeader>
                <CardDescription className="text-xs">Total Labs</CardDescription>
                <CardTitle className="text-3xl font-bold text-red-600">{totalLabs}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="border-l-4 border-l-red-500">
              <CardHeader>
                <CardDescription className="text-xs">Investment</CardDescription>
                <CardTitle className="text-2xl font-bold text-red-600">₹{totalInvestment.toFixed(2)}L</CardTitle>
              </CardHeader>
            </Card>
            <Card className="border-l-4 border-l-red-500">
              <CardHeader>
                <CardDescription className="text-xs">Departments</CardDescription>
                <CardTitle className="text-3xl font-bold text-red-600">{departmentInfrastructure.length}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="border-l-4 border-l-red-500">
              <CardHeader>
                <CardDescription className="text-xs">Equipment Categories</CardDescription>
                <CardTitle className="text-3xl font-bold text-red-600">{totalEquipments}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          {/* Department Labs - Summary Cards */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Department-wise Laboratories</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {departmentInfrastructure.map((dept, deptIdx) => (
                dept.labs.map((lab, labIdx) => (
                  <Card
                    key={`${deptIdx}-${labIdx}`}
                    className="border-l-4 border-l-red-500 hover:-translate-y-1 transition-transform shadow-sm hover:shadow-lg"
                  >
                    <CardHeader>
                      <div className="flex items-start space-x-2 mb-2">
                        <Microscope className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <CardTitle className="text-lg leading-tight">{lab.name}</CardTitle>
                      </div>
                      <CardDescription className="text-sm">Modern lab equipped with advanced technology</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        <Badge variant="secondary" className="text-xs">Value: {lab.totalValue}</Badge>
                        <Badge variant="secondary" className="text-xs">Capacity: {lab.capacity}</Badge>
                        <Badge variant="secondary" className="text-xs">{lab.newEquipments.length} equipment</Badge>
                      </div>
                      <p className="text-sm text-gray-600">{dept.department}</p>
                    </CardContent>
                  </Card>
                ))
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar currentPage="infrastructure-facilities" onNavigate={onNavigate} />
      <main className="ml-64 p-8">
        <div className="p-6">
          {/* Page Title */}
          <div className="mb-8">
            <h1 className="text-2xl font-medium text-gray-900 mb-2">Infrastructure & Facilities</h1>
            <p className="text-gray-600">
              Overview of campus infrastructure, laboratories, and facilities
            </p>
          </div>

          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardDescription className="text-xs">Total Investment</CardDescription>
                  <DollarSign className="w-5 h-5 text-blue-600" />
                </div>
                <CardTitle className="text-2xl font-bold text-blue-600">₹{totalInvestment.toFixed(2)} L</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">In new equipment</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardDescription className="text-xs">Total Labs</CardDescription>
                  <Building2 className="w-5 h-5 text-green-600" />
                </div>
                <CardTitle className="text-3xl font-bold text-green-600">{totalLabs}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">Across all departments</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardDescription className="text-xs">New Equipment</CardDescription>
                  <Cpu className="w-5 h-5 text-purple-600" />
                </div>
                <CardTitle className="text-3xl font-bold text-purple-600">{totalEquipments}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">Categories acquired</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-orange-500">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardDescription className="text-xs">Departments</CardDescription>
                  <Layers className="w-5 h-5 text-orange-600" />
                </div>
                <CardTitle className="text-3xl font-bold text-orange-600">{departmentInfrastructure.length}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">Engineering streams</p>
              </CardContent>
            </Card>
          </div>

          {/* Department-wise Infrastructure */}
          <div className="space-y-6">
            {departmentInfrastructure.map((dept, deptIdx) => (
              <Card key={deptIdx} className="overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 border-b">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Building2 className="w-6 h-6 text-blue-600" />
                    {dept.department}
                  </CardTitle>
                  <CardDescription>{dept.labs.length} specialized laboratories</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-6">
                    {dept.labs.map((lab, labIdx) => (
                      <div key={labIdx} className="p-5 bg-gradient-to-br from-gray-50 to-white rounded-lg border border-gray-200">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <Microscope className="w-5 h-5 text-purple-600" />
                              <h4 className="font-semibold text-lg">{lab.name}</h4>
                              <Badge className="bg-green-600 text-white">
                                {lab.totalValue}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600">Student Capacity: {lab.capacity}</p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <h5 className="font-semibold text-sm text-gray-700 mb-3">New Equipment Acquired:</h5>
                          {lab.newEquipments.map((equipment, eqIdx) => (
                            <div key={eqIdx} className="flex items-center justify-between p-3 bg-white rounded border border-gray-200 hover:shadow-sm transition-shadow">
                              <div className="flex-1">
                                <p className="font-medium">{equipment.item}</p>
                                <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                                  <span className="flex items-center gap-1">
                                    <Cpu className="w-3 h-3" />
                                    Qty: {equipment.quantity}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {new Date(equipment.acquired).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                              <div className="text-right">
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                  {equipment.value}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}