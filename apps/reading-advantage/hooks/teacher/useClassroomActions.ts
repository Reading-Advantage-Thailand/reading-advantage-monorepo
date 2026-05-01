import { useClassroomState } from "@/store/classroom-store";
import { toast } from "@/components/ui/use-toast";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

export const useClassroomActions = () => {
    const router = useRouter();
    const [isResetting, setIsResetting] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(false);
    const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);
    const {
        selectedClassroom,
        setClasses,
        setSelectedClassroom,
        setStudentInClass,
    } = useClassroomState();

    const fetchStudentInClass = useCallback(async (classId: string) => {
        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_BASE_URL}/api/v1/classroom/${classId}`,
                {
                    method: "GET",
                }
            );
            if (!res.ok) throw new Error("Failed to fetch Classroom list");

            const data = await res.json();
            setStudentInClass(data.studentInClass);
            setClasses(data.classroom);
        } catch (error) {
            console.error("Error fetching Classroom list:", error);
        }
    }, [setStudentInClass, setClasses]);

    const handleClassChange = useCallback(async (value: string) => {
        try {
            setSelectedClassroom(value);

            await fetchStudentInClass(value);
            router.push(`/teacher/class-roster/${value}`);
        } catch (error) {
            console.error("Error fetching Classroom list:", error);
        }
    }, [setSelectedClassroom, fetchStudentInClass, router]);

    const syncStudents = useCallback(async (courseId: string) => {
        setLoading(true);

        try {
            const lastUrl = window.location.pathname;
            const response = await fetch(
                `/api/v1/classroom/oauth2/classroom/courses/${courseId}?redirect=${encodeURIComponent(
                    lastUrl
                )}`,
                {
                    method: "GET",
                }
            );

            const data = await response.json();

            if (response.ok && !data.authUrl) {
                toast({
                    title: "Success",
                    description: "Students synced successfully",
                });
            } else if (response.status === 401) {
                toast({
                    title: "Error",
                    description: "No student in class",
                });
            } else {
                window.location.href = data.authUrl;
            }
        } catch (error) {
            console.error("Error fetching courses:", error);
        }
        setLoading(false);
    }, []);

    const handleResetProgress = useCallback(async (selectedStudentId: string) => {
        setIsResetting(true);
        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_BASE_URL}/api/v1/users/${selectedStudentId}/reset-all-progress`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    cache: "no-cache",
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                toast({
                    title: "Fail.",
                    description: errorData.message || `XP reset failed.`,
                });
                return;
            }

            toast({
                title: "Success.",
                description: `Student progress reset successfully.`,
            });

            if (typeof window !== "undefined") {
                clearCache(selectedStudentId);
            }

            if (selectedClassroom) {
                await fetchStudentInClass(selectedClassroom);
            }

            window.location.reload();
        } catch (error) {
            console.error("Error resetting progress:", error);
            toast({
                title: "Fail.",
                description: `Failed to reset student progress.`,
            });
        } finally {
            setIsResetting(false);
            setIsResetModalOpen(false);
        }
    }, [fetchStudentInClass, selectedClassroom]);

    const clearCache = useCallback((studentId: string) => {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (
                key &&
                (key.includes("mcq") ||
                    key.includes("question") ||
                    key.includes(studentId))
            ) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach((key) => localStorage.removeItem(key));

        const sessionKeysToRemove = [];
        for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            if (
                key &&
                (key.includes("mcq") ||
                    key.includes("question") ||
                    key.includes(studentId))
            ) {
                sessionKeysToRemove.push(key);
            }
        }
        sessionKeysToRemove.forEach((key) => sessionStorage.removeItem(key));
    }, []);

    return {
        fetchStudentInClass,
        handleClassChange,
        syncStudents,
        handleResetProgress,
        loading,
        isResetting,
        isResetModalOpen,
        setIsResetModalOpen
    };
}