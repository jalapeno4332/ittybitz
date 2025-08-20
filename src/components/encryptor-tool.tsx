
"use client";

import { useState, useRef, type ChangeEvent, type DragEvent, memo, useCallback, useEffect } from "react";
import {
  KeyRound,
  Lock,
  Unlock,
  Loader2,
  FileText,
  Copy,
  Eye,
  EyeOff,
  RefreshCw,
  X,
  Heart,
  Info,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { encryptFile, decryptFile } from "@/lib/crypto";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


type Mode = "encrypt" | "decrypt";
type InputType = "file" | "text";

const validateAndSanitizeFile = (file: File) => {
  if (file.name.includes('..') || 
      file.name.includes('/') || 
      file.name.includes('\\') ||
      file.name.length > 255) {
    throw new Error('Invalid filename. It may contain invalid characters or be too long.');
  }
  
  if (file.name.includes('\0')) {
    throw new Error('Invalid filename. It contains null bytes.');
  }
  
  return true;
};

interface FileSelectorProps {
  id: string;
  onFileChange: (event: ChangeEvent<HTMLInputElement> | DragEvent<HTMLDivElement>) => void;
  onClear: () => void;
  selectedFile: File | null;
  icon: React.ReactNode;
  label: string;
  description: string;
}

const FileSelector = memo(({
  id,
  onFileChange,
  onClear,
  selectedFile,
  icon,
  label,
  description,
}: FileSelectorProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleContainerClick = useCallback(() => {
    inputRef.current?.click();
  }, []);
  
  const handleDragEnter = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileChange(e);
    }
  }, [onFileChange]);


  return (
    <div>
      <div
        className={cn("relative flex w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20 p-6 text-center transition-colors duration-200 hover:border-primary/50", { 'border-primary/50 bg-primary/10': isDragging })}
        onClick={handleContainerClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && handleContainerClick()}
      >
        <div className="mb-2 text-primary">{icon}</div>
        <div className="w-full overflow-hidden">
          <h3 className="text-md font-semibold text-foreground">{label}</h3>
          <p className={cn("mt-1 w-full overflow-hidden truncate text-sm", selectedFile ? "text-accent font-semibold" : "text-muted-foreground")}>
            {selectedFile ? selectedFile.name : description}
          </p>
        </div>
      </div>
       {selectedFile && (
        <div className="text-right">
          <Button variant="link" size="sm" onClick={onClear} className="text-destructive hover:text-destructive/80">
            Clear
          </Button>
        </div>
      )}
      <Input
        id={id}
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={onFileChange}
      />
    </div>
  );
});
FileSelector.displayName = "FileSelector";

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB

export function EncryptorTool() {
  const [mode, setMode] = useState<Mode>("encrypt");
  const [inputType, setInputType] = useState<InputType>('file');
  const [file, setFile] = useState<File | null>(null);
  const [textSecret, setTextSecret] = useState('');
  const [outputText, setOutputText] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showDecryptedText, setShowDecryptedText] = useState(false);
  const [useKeyFile, setUseKeyFile] = useState(false);
  const [keyFile, setKeyFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [passwordIsStrong, setPasswordIsStrong] = useState(false);
  const [isCryptoAvailable, setIsCryptoAvailable] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!window.crypto || !window.crypto.subtle || !window.crypto.getRandomValues) {
      setIsCryptoAvailable(false);
      toast({
        title: "Security Warning",
        description: "Web Crypto API is not available in this browser. This application cannot run securely.",
        variant: "destructive",
        duration: Infinity, // Keep it visible
      });
    }
  }, [toast]);

  const checkIsPasswordStrong = useCallback((pwd: string) => {
    const hasUpperCase = /[A-Z]/.test(pwd);
    const hasLowerCase = /[a-z]/.test(pwd);
    const hasNumbers = /\d/.test(pwd);
    const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(pwd);
    const hasMinLength = pwd.length >= 24;
    return hasMinLength && hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChars;
  }, []);

  const handlePasswordChange = useCallback((pwd: string) => {
    setPassword(pwd);
    setPasswordIsStrong(checkIsPasswordStrong(pwd));
  }, [checkIsPasswordStrong]);

  const resetState = useCallback(() => {
    setFile(null);
    setPassword('');
    setPasswordIsStrong(false);
    setShowPassword(false);
    setUseKeyFile(false);
    setKeyFile(null);
    setTextSecret('');
    setOutputText('');
    setShowDecryptedText(false);
    setInputType('file');
  }, []);

  const handleModeChange = useCallback((newMode: string) => {
    setMode(newMode as Mode);
    resetState();
  }, [resetState]);
  
  const handleInputTypeChange = useCallback((newType: string) => {
      setInputType(newType as InputType);
  }, []);

  const handleFileChange = useCallback((
    e: ChangeEvent<HTMLInputElement> | DragEvent<HTMLDivElement>,
    setter: (file: File | null) => void
  ) => {
    let selectedFile: File | null = null;
    if ('dataTransfer' in e) { // DragEvent
      selectedFile = e.dataTransfer.files?.[0] || null;
    } else { // ChangeEvent
      selectedFile = e.target.files?.[0] || null;
      if (e.target) {
        e.target.value = "";
      }
    }

    if (!selectedFile) {
        setter(null);
        return;
    }

    try {
      validateAndSanitizeFile(selectedFile);
    } catch (error: any) {
        toast({
            title: "Invalid File",
            description: error.message,
            variant: "destructive",
        });
        setter(null);
        return;
    }
    
    if (selectedFile.size > MAX_FILE_SIZE) {
      toast({
        title: "File Too Large",
        description: `Please select a file smaller than ${MAX_FILE_SIZE / 1024 / 1024}MB.`,
        variant: "destructive",
      });
      setter(null);
      return;
    }

    setter(selectedFile);
  }, [toast]);
  

  const generatePassword = useCallback(() => {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+~`|}{[]:;?><,./-=";
    const passwordLength = 32;
    let newPassword = "";
    const array = new Uint32Array(passwordLength);
    window.crypto.getRandomValues(array);
    for (let i = 0; i < passwordLength; i++) {
      const charIndex = array[i];
      if (charIndex !== undefined) {
        newPassword += charset.charAt(charIndex % charset.length);
      }
    }
    handlePasswordChange(newPassword);
    toast({ title: "Password Generated", description: "A new secure password has been generated." });
  }, [toast, handlePasswordChange]);


  const handleCopy = useCallback((textToCopy: string) => {
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy).then(() => {
      toast({ title: "Copied to clipboard" });
    }).catch(() => {
       toast({ title: "Failed to copy", variant: "destructive" });
    });
  }, [toast]);

  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const processData = useCallback(async () => {
    let mutablePassword = password;

    const hasInput = inputType === 'file' ? !!file : !!textSecret;
    if (!hasInput) {
      toast({
        title: `Missing ${inputType === 'file' ? 'File' : 'Text'}`,
        description: `Please provide a ${inputType} to process.`,
        variant: "destructive",
      });
      return;
    }
    if (!mutablePassword) {
        toast({
          title: "Password Required",
          description: "Please provide a password.",
          variant: "destructive",
        });
        return;
    }
    
    if (mode === "encrypt" && !checkIsPasswordStrong(mutablePassword)) {
        toast({
          title: "Weak Password",
          description: "Please use a password that is at least 24 characters and includes uppercase, lowercase, numbers, and symbols.",
          variant: "destructive",
        });
        return;
    }

    setIsLoading(true);
    setOutputText('');
    setShowDecryptedText(false);

    try {
      const keyFileBuffer = keyFile ? await keyFile.arrayBuffer() : null;
      
      let resultBuffer: ArrayBuffer;
      
      if (mode === 'encrypt') {
        const encoder = new TextEncoder();
        const inputBuffer = inputType === 'file' ? await file!.arrayBuffer() : (encoder.encode(textSecret).buffer as ArrayBuffer);
        resultBuffer = await encryptFile(inputBuffer, mutablePassword, keyFileBuffer);

        if (inputType === 'file') {
            const blob = new Blob([resultBuffer]);
            triggerDownload(blob, `${file!.name}.ibitz`);
            setFile(null);
        } else {
            const base64String = btoa(String.fromCharCode(...new Uint8Array(resultBuffer)));
            setOutputText(base64String);
            setTextSecret('');
        }

      } else { // Decrypt
        let inputBuffer: ArrayBuffer;
        if (inputType === 'file') {
            inputBuffer = await file!.arrayBuffer();
        } else {
            const binaryString = atob(textSecret);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            inputBuffer = bytes.buffer;
        }

        resultBuffer = await decryptFile(inputBuffer, mutablePassword, keyFileBuffer);
        
        if (inputType === 'file') {
             const resultFilename = file!.name.endsWith('.ibitz')
              ? file!.name.slice(0, -'.ibitz'.length)
              : `decrypted-${file!.name}`;
            const blob = new Blob([resultBuffer]);
            triggerDownload(blob, resultFilename);
        } else {
            const decoder = new TextDecoder();
            setOutputText(decoder.decode(resultBuffer));
        }
      }

      toast({
        title: "Success!",
        description: `Your ${inputType} has been successfully ${mode === 'encrypt' ? 'encrypted' : 'decrypted'}.`,
      });
    } catch (error: any) {
        const safeMessage = (error.message?.toLowerCase().includes('decrypt') || error.message?.toLowerCase().includes('corrupted'))
          ? 'Decryption failed. The password or key file may be incorrect, or the data may be corrupted.'
          : error.message || 'An unknown error occurred.';

        toast({
            title: "Processing Error",
            description: safeMessage,
            variant: "destructive",
        });
    } finally {
      // Clear sensitive data
      mutablePassword = ''; 
      setPassword('');
      setPasswordIsStrong(false);
      setIsLoading(false);
    }
  }, [file, mode, keyFile, toast, inputType, textSecret, checkIsPasswordStrong, password]);
  
  const handleUseKeyFileChange = useCallback((checked: boolean) => {
      setUseKeyFile(checked);
      if (!checked) {
          setKeyFile(null);
      }
  }, []);

  const getPasswordStrengthColor = useCallback(() => {
    if (!password) return "border-input";
    if (checkIsPasswordStrong(password)) return "border-success";
    return "border-destructive";
  }, [checkIsPasswordStrong, password]);

  const isProcessButtonDisabled = () => {
    if (isLoading || !isCryptoAvailable) return true;
    const hasInput = inputType === 'file' ? !!file : !!textSecret;
    const hasPassword = !!password;
    if (!hasInput || !hasPassword) return true;
    
    if (mode === 'encrypt' && !passwordIsStrong) {
        return true;
    }
    
    return false;
  }

  const renderContent = (currentMode: Mode) => (
    <div className="space-y-6">
      <div className="space-y-4">
        <RadioGroup value={inputType} onValueChange={handleInputTypeChange} className="flex justify-center space-x-4">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="file" id="file-option" />
            <Label htmlFor="file-option" className="cursor-pointer">File</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="text" id="text-option" />
            <Label htmlFor="text-option" className="cursor-pointer">Text</Label>
          </div>
        </RadioGroup>

        {inputType === 'file' ? (
           <FileSelector
            id={`${currentMode}-file`}
            onFileChange={(e) => handleFileChange(e, setFile)}
            onClear={() => setFile(null)}
            selectedFile={file}
            icon={<FileText size={32} />}
            label="Select File (100MB Max)"
            description={`Drag & drop or click to select file to ${currentMode}`}
          />
        ) : (
          <div className="space-y-2">
            <Label htmlFor="text-secret">Secret Text</Label>
            <Textarea
              id="text-secret"
              value={textSecret}
              onChange={(e) => setTextSecret(e.target.value)}
              placeholder={`Enter text to ${currentMode}...`}
              rows={5}
            />
          </div>
        )}
        
        <TooltipProvider>
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Label htmlFor="password">Password</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="focus:outline-none">
                      <Info className="h-4 w-4 text-orange-500" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Min 24 chars, 1 uppercase, 1 lowercase, 1 number, 1 symbol.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
            <div className="relative mt-1">
                <Input
                    id="password"
                    value={password}
                    type={showPassword ? "text" : "password"}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    placeholder="Enter password..."
                    className={cn(
                      "pr-10 transition-colors duration-300",
                      getPasswordStrengthColor()
                    )}
                />
                <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff /> : <Eye />}
                </Button>
            </div>
            <div className="flex flex-wrap justify-center gap-2 mt-2">
                <Button variant="outline" size="sm" onClick={() => handleCopy(password)} disabled={!password}><Copy className="mr-1 h-3 w-3" />Copy</Button>
                <Button variant="outline" size="sm" onClick={() => handlePasswordChange("")} disabled={!password}><X className="mr-1 h-3 w-3" />Clear</Button>
                {currentMode === 'encrypt' && <Button variant="outline" size="sm" onClick={generatePassword}><RefreshCw className="mr-1 h-3 w-3" />Generate</Button>}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch id="use-keyfile" checked={useKeyFile} onCheckedChange={handleUseKeyFileChange} />
             <div className="flex items-center gap-1">
                <Label htmlFor="use-keyfile">Use Key File (Optional)</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="focus:outline-none">
                      <Info className="h-4 w-4 text-orange-500" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Increase security by "attaching" a file to your encrypted data. The file will be required to decrypt the data. Any file will work, but image files (JPEG, PNG) provide the most entropy.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
          </div>
        

        {useKeyFile && (
            <div className="animate-in fade-in-50">
                 <FileSelector
                    id={`${currentMode}-keyfile`}
                    onFileChange={(e) => handleFileChange(e, setKeyFile)}
                    onClear={() => setKeyFile(null)}
                    selectedFile={keyFile}
                    icon={<KeyRound size={32} />}
                    label="Select Key File"
                    description="Drag & drop or click for an extra layer of security"
                    />
            </div>
        )}
        </TooltipProvider>
      </div>

       {outputText && (
          <div className="space-y-2 animate-in fade-in-50">
            <Label htmlFor="output-text">Result</Label>
            <div className="relative">
              <Textarea
                id="output-text"
                value={outputText}
                readOnly
                rows={5}
                className={cn(
                  "pr-20",
                  mode === 'decrypt' && inputType === 'text' && !showDecryptedText && "blur-sm"
                )}
              />
              <div className="absolute right-1 top-1 flex items-center">
                 {mode === 'decrypt' && inputType === 'text' && (
                  <Button type="button" variant="ghost" size="icon" className="h-auto p-2" onClick={() => setShowDecryptedText(!showDecryptedText)}>
                    {showDecryptedText ? <EyeOff /> : <Eye />}
                  </Button>
                )}
                <Button type="button" variant="ghost" size="icon" className="h-auto p-2" onClick={() => handleCopy(outputText)}>
                    <Copy />
                </Button>
              </div>
            </div>
          </div>
        )}

      <Button
        onClick={processData}
        disabled={isProcessButtonDisabled()}
        className="w-full text-lg font-bold py-6 bg-gradient-to-br from-yellow-400 via-orange-500 to-red-600 text-primary-foreground hover:opacity-90 transition-all duration-300 transform hover:scale-105"
      >
        {isLoading ? (
          <Loader2 className="mr-2 h-6 w-6 animate-spin" />
        ) : (
          currentMode === 'encrypt' ? <Lock className="mr-2 h-6 w-6" /> : <Unlock className="mr-2 h-6 w-6" />
        )}
        {currentMode === 'encrypt' ? `Encrypt ${inputType === 'file' ? 'File' : 'Text'}` : `Decrypt ${inputType === 'file' ? 'File' : 'Text'}`}
      </Button>
    </div>
  );

  return (
    <Card className="w-full max-w-md shadow-2xl bg-card/80 backdrop-blur-sm border border-zinc-700">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2">
          <img src="/logo.png" alt="IttyBitz Logo" width={64} height={64} />
        </div>
        <CardTitle className="text-3xl font-bold">IttyBitz</CardTitle>
        <CardDescription className="font-semibold text-white">
          Secure by design. Simple by nature.
        </CardDescription>
        <p className="text-sm text-muted-foreground pt-2">
            Secure, <a href="https://github.com/jalapeno4332/ittybitz" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">open-source</a>, client-side encryption and decryption.
        </p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="encrypt" className="w-full" onValueChange={handleModeChange}>
          <TabsList className="grid w-full grid-cols-2 bg-zinc-800 p-1">
            <TabsTrigger value="encrypt" className="font-semibold data-[state=active]:bg-gradient-to-br data-[state=active]:from-yellow-400 data-[state=active]:via-orange-500 data-[state=active]:to-red-600 data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg">
              <Lock className="mr-2 h-4 w-4" />
              Encrypt
            </TabsTrigger>
            <TabsTrigger value="decrypt" className="font-semibold data-[state=active]:bg-gradient-to-br data-[state=active]:from-yellow-400 data-[state=active]:via-orange-500 data-[state=active]:to-red-600 data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg">
              <Unlock className="mr-2 h-4 w-4" />
              Decrypt
            </TabsTrigger>
          </TabsList>
          <TabsContent value="encrypt" className="pt-6">
            {renderContent("encrypt")}
          </TabsContent>
          <TabsContent value="decrypt" className="pt-6">
            {renderContent("decrypt")}
          </TabsContent>
        </Tabs>
      </CardContent>
       <CardFooter className="flex-col items-center justify-center pt-6 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Heart className="h-4 w-4 text-red-500" />
          <span>Enjoying IttyBitz?</span>
        </div>
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="link" className="text-accent p-0 h-auto">Support this project</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Support IttyBitz</DialogTitle>
                    <DialogDescription>
                        If you find this tool useful, please consider supporting its development. Your donation helps keep the project alive and ad-free.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col items-center gap-4 py-4">
                    <img src="https://api.qrserver.com/v1/create-qr-code/?size=128x128&data=https://coinos.io/svrn_money" alt="Donation QR Code" width="128" height="128" />
                    <a href="https://coinos.io/svrn_money" target="_blank" rel="noopener noreferrer" className="text-sm text-accent hover:underline break-all">
                        https://coinos.io/svrn_money
                    </a>
                </div>
            </DialogContent>
        </Dialog>
      </CardFooter>
    </Card>
  );
}

    

    