import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema, type InsertUser } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, Award } from "lucide-react";

export default function AuthPage() {
  const { user, login, register } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("login");

  // Redirect if already logged in
  if (user) {
    setLocation("/");
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        
        {/* Left Side: Branding */}
        <div className="hidden md:flex flex-col justify-center space-y-6">
          <div className="bg-primary/10 w-16 h-16 rounded-2xl flex items-center justify-center">
            <Award className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-5xl font-bold font-display leading-tight text-foreground">
            Track your <span className="text-gradient">Wins.</span><br />
            Build your <span className="text-gradient">Legacy.</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-sm leading-relaxed">
            A minimalist space to record your professional milestones and personal achievements. Simple, focused, and yours.
          </p>
        </div>

        {/* Right Side: Auth Form */}
        <Card className="w-full glass-panel border-0 shadow-2xl">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-2xl font-bold text-center">Welcome</CardTitle>
            <CardDescription className="text-center">
              Sign in to your account or create a new one
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-8">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <AuthForm 
                  mode="login" 
                  onSubmit={(data) => login.mutate(data)} 
                  isPending={login.isPending} 
                />
              </TabsContent>
              
              <TabsContent value="register">
                <AuthForm 
                  mode="register" 
                  onSubmit={(data) => register.mutate(data)} 
                  isPending={register.isPending} 
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function AuthForm({ 
  mode, 
  onSubmit, 
  isPending 
}: { 
  mode: "login" | "register", 
  onSubmit: (data: InsertUser) => void, 
  isPending: boolean 
}) {
  const form = useForm<InsertUser>({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input placeholder="johndoe" {...field} className="bg-white/50" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••••" {...field} className="bg-white/50" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button 
          type="submit" 
          className="w-full mt-2 font-semibold text-md h-11" 
          disabled={isPending}
        >
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {mode === "login" ? "Sign In" : "Create Account"}
        </Button>
      </form>
    </Form>
  );
}
