"use client";
import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import dynamic from "next/dynamic";
import { License } from "@/server/models/license";

const GaugeChart = dynamic(() => import("react-gauge-chart"), { ssr: false });

async function fetchLicense() {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/v1/licenses`
  );

  const data = await response.json();
  return data;
}
export default function LicenseUsageChart() {
  const [licenseData, setLicenseData] = useState<License[]>([]);

  const calculatePercentage = (usedLicenses: number, totalLicenses: number) => {
    return (usedLicenses / totalLicenses) * 100;
  };

  useEffect(() => {
    async function loadLicenseData() {
      const license = await fetchLicense();
      setLicenseData(license.data);
    }
    loadLicenseData();
  }, []);

  return (
    <>
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-lg font-bold sm:text-xl md:text-2xl">
            License Usage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Carousel>
            <CarouselContent>
              {licenseData.map((license: License, index) => (
                <CarouselItem key={index}>
                  <div className="p-1 sm:p-2 md:p-4">
                    <div className="flex justify-between flex-col sm:flex-row mb-2 sm:mb-4">
                      <CardDescription className="text-xs sm:text-sm">
                        School: {license.schoolName}
                      </CardDescription>
                      <CardDescription className="text-xs sm:text-sm">
                        License Type: {license.licenseType}
                      </CardDescription>
                    </div>
                    <div className="flex justify-between flex-col sm:flex-row mb-2 sm:mb-4">
                      <CardDescription className="text-xs sm:text-sm">
                        Used: {license.usedLicenses}/{license.maxUsers} licenses
                      </CardDescription>
                      <CardDescription className="text-xs sm:text-sm">
                        Expires: {new Date(license.expiresAt).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <CardContent className="flex items-center justify-center sm:p-4 md:p-6">
                      <div
                        className="w-full max-w-md sm:max-w-sm md:max-w-md"
                        id="gaugeArea"
                      >
                        <GaugeChart
                          id="gauge-chart"
                          // nrOfLevels={30}
                          percent={
                            license.usedLicenses / license.maxUsers
                          }
                          arcWidth={0.3}
                          cornerRadius={0}
                          textColor="#000000"
                          needleColor="#737373"
                          needleBaseColor="#737373"
                          // colors={['lightgray','rgb(44,151,222)']}
                          //  colors={["#00BFFF", "#1E90FF"]}
                          //  colors={["#E5E7EB", "#3B82F6"]}
                          colors={["#EA4228", "#F5CD19", "#5BE12C"]}
                          arcPadding={0}
                          hideText={true}
                          nrOfLevels={420}
                        />

                        <div className="text-center text-2xl font-bold mt-2 sm:text-3xl md:text-4xl sm:mt-4">
                          {(
                            (license.usedLicenses / license.maxUsers) * 100
                          ).toFixed(2)}
                          %
                        </div>

                        <div className="flex justify-between mt-2 text-xs sm:text">
                          <span>0%</span>
                          <span>100%</span>
                        </div>

                        {/* <CircularProgressbar
                            value={calculatePercentage(license.used_licenses, license.total_licenses)}
                            text={calculatePercentage(license.used_licenses, license.total_licenses) + "%"} 
                            circleRatio={0.5}
                            styles={{
                              trail: {
                                strokeLinecap: "butt",
                                transform: "rotate(-0.25turn)",
                                transformOrigin: "center center",
                              },
                              path: {
                                strokeLinecap: "butt",
                                transform: "rotate(-0.25turn)",
                                transformOrigin: "center center",
                                stroke: "#3B82F6",
                              },
                              text: {
                                fill: "#000",
                                fontSize: "12px",
                              },
                              }}
                              strokeWidth={15}
                            >
                            </CircularProgressbar> */}
                      </div>
                    </CardContent>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </CardContent>
      </Card>
    </>
  );
}
