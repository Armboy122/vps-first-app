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
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { Prisma, Request, OMSStatus } from '@prisma/client';

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
  urgentRequests: number;
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

interface LatestRequest {
  id: number;
  createdAt: Date;
  createdBy: { fullName: string };
  workCenter: { name: string };
  branch: { shortName: string };
  statusRequest: Request;
}

interface WorkCenterRequest {
  workCenterId: number;
  _count: { _all: number };
}

interface DashboardClientProps {
  data: {
    summary: SummaryData;
    omsStatus: OMSStatusData[];
    latestRequests: LatestRequest[];
    requestsByWorkCenter: WorkCenterRequest[];
    averageApprovalTime: number;
    pendingApprovals: number;
  };
}

export function DashboardClient({ data }: DashboardClientProps) {
  const { summary, omsStatus, latestRequests, requestsByWorkCenter, averageApprovalTime, pendingApprovals } = data;

  return (
    <main className="p-4 md:p-10 mx-auto max-w-7xl">
      <Grid numItemsSm={2} numItemsLg={4} className="gap-6">
        <Card>
          <Title>คำขอทั้งหมด</Title>
          <Text>{summary.totalRequests}</Text>
        </Card>
        <Card>
          <Title>คำขอเร่งด่วน</Title>
          <Text>{summary.urgentRequests}</Text>
        </Card>
        <Card>
          <Title>เวลาอนุมัติเฉลี่ย</Title>
          <Text>{averageApprovalTime.toFixed(2)} ชั่วโมง</Text>
        </Card>
        <Card>
          <Title>รออนุมัตินาน</Title>
          <Text>{pendingApprovals}</Text>
        </Card>
      </Grid>

      <TabGroup className="mt-6">
        <TabList>
          <Tab>Overview</Tab>
          <Tab>Details</Tab>
        </TabList>
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
                <Title>แนวโน้มคำขอรายวัน</Title>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={summary.dailyTrend.map(item => ({
                    outageDate: item.outageDate.toISOString().split('T')[0],
                    count: item._count._all
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="outageDate" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="count" stroke="#8884d8" name="จำนวนคำขอ" />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
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
          <TabPanel>
            <Card>
              <Title>คำขอล่าสุด</Title>
              <Table className="mt-6">
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>วันที่</TableHeaderCell>
                    <TableHeaderCell>ผู้สร้าง</TableHeaderCell>
                    <TableHeaderCell>ศูนย์งาน</TableHeaderCell>
                    <TableHeaderCell>สาขา</TableHeaderCell>
                    <TableHeaderCell>สถานะ</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {latestRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>{new Date(request.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>{request.createdBy.fullName}</TableCell>
                      <TableCell>{request.workCenter.name}</TableCell>
                      <TableCell>{request.branch.shortName}</TableCell>
                      <TableCell>{request.statusRequest}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabPanel>
        </TabPanels>
      </TabGroup>
    </main>
  );
}