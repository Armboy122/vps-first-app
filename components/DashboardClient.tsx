"use client"

import React from 'react';
import {
  Card,
  Title,
  Text,
  TabList,
  Tab,
  TabGroup,
  TabPanel,
  TabPanels,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@tremor/react';
import {
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { Prisma, OMSStatus } from '@prisma/client';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

interface PieChartData {
  name: string;
  value: number;
}

interface CustomPieChartProps {
  data: PieChartData[];
  title: string;
}

const CustomPieChart: React.FC<CustomPieChartProps> = ({ data, title }) => (
  <Card>
    <Title>{title}</Title>
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  </Card>
);

interface SummaryData {
  totalRequests: number;
  statusDistribution: (Prisma.PickEnumerable<Prisma.PowerOutageRequestGroupByOutputType, ["statusRequest"]> & {
    _count: {
      _all: number;
    };
  })[];
  threeRequests: number;
  sevenRequests: number;
  dailyTrend: (Prisma.PickEnumerable<Prisma.PowerOutageRequestGroupByOutputType, ["outageDate"]> & {
    _count: {
      _all: number;
    };
  })[];
}

interface OMSStatusData {
  omsStatus: OMSStatus;
  _count: { _all: number };
}

interface WorkCenterRequest {
  workCenterId: number;
  _count: { _all: number };
}

interface DashboardClientProps {
  data: {
    summary: SummaryData;
    omsStatus: OMSStatusData[];
    requestsByWorkCenter: WorkCenterRequest[];
  };
}

export function DashboardClient({ data }: DashboardClientProps) {
  const { summary, omsStatus, requestsByWorkCenter } = data;

  return (
    <main className="p-4 md:p-10 mx-auto max-w-7xl">
      <Grid numItemsSm={2} numItemsLg={4} className="gap-6">
        <Card>
          <Title>คำขอทั้งหมด</Title>
          <Text>{summary.totalRequests}</Text>
        </Card>
        <Card>
          <Title>คำขอเร่งด่วนภายใน 3 วัน</Title>
          <Text>{summary.threeRequests}</Text>
        </Card>
        <Card>
          <Title>คำขอเร่งด่วนภายใน 7 วัน</Title>
          <Text>{summary.sevenRequests}</Text>
        </Card>
      </Grid>

      <TabGroup className="mt-6">
        <TabPanels>
          <TabPanel>
            <Grid numItemsMd={2} className="mt-6 gap-6">
              <CustomPieChart
                data={summary.statusDistribution.map(item => ({
                  name: item.statusRequest,
                  value: item._count._all
                }))}
                title="สถานะคำขอ"
              />
              <CustomPieChart
                data={omsStatus.map(item => ({
                  name: item.omsStatus,
                  value: item._count._all
                }))}
                title="สถานะ OMS"
              />
              <Card>
                <Title>คำขอตามศูนย์งาน</Title>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={requestsByWorkCenter}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="workCenterId" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="_count._all" fill="#8884d8" name="จำนวนคำขอ" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </Grid>
          </TabPanel>
        </TabPanels>
      </TabGroup>
    </main>
  );
}