import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useListProducts, useCreateProduct, useDeleteProduct, getListProductsQueryKey, getGetStatsQueryKey } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Trash2, Plus, Box, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Products() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: products, isLoading } = useListProducts();
  const createProduct = useCreateProduct();
  const deleteProduct = useDeleteProduct();

  const [name, setName] = useState("");
  const [gamePassId, setGamePassId] = useState("");
  const [description, setDescription] = useState("");

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !gamePassId) return;

    createProduct.mutate(
      { data: { name, gamePassId, description } },
      {
        onSuccess: () => {
          setName("");
          setGamePassId("");
          setDescription("");
          queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetStatsQueryKey() });
          toast({
            title: "Product added",
            description: "The product has been successfully added to the database.",
          });
        },
        onError: () => {
          toast({
            title: "Error",
            description: "Failed to add product. Check the game pass ID and try again.",
            variant: "destructive",
          });
        },
      }
    );
  };

  const handleDelete = (id: string) => {
    deleteProduct.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetStatsQueryKey() });
          toast({
            title: "Product removed",
            description: "The product has been permanently deleted.",
          });
        },
        onError: () => {
          toast({
            title: "Error",
            description: "Failed to delete product.",
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold uppercase tracking-tight text-primary">Products</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage game passes available for verification.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-[120px] w-full bg-secondary" />
                ))}
              </div>
            ) : products?.length === 0 ? (
              <Card className="rounded-none border-border bg-card shadow-none">
                <CardContent className="flex flex-col items-center justify-center p-12 text-muted-foreground">
                  <Box className="h-12 w-12 mb-4 opacity-50" />
                  <p className="uppercase tracking-widest text-sm">No products found</p>
                </CardContent>
              </Card>
            ) : (
              products?.map((product) => (
                <Card key={product.id} className="rounded-none border-border bg-card shadow-none hover:border-primary/50 transition-colors group">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <h3 className="font-bold text-lg text-foreground uppercase tracking-wide">{product.name}</h3>
                          <span className="text-xs bg-secondary text-primary px-2 py-1 uppercase tracking-widest font-mono">
                            ID: {product.gamePassId}
                          </span>
                        </div>
                        {product.description && (
                          <p className="text-sm text-muted-foreground max-w-xl">{product.description}</p>
                        )}
                        <a 
                          href={`https://www.roblox.com/game-pass/${product.gamePassId}`}
                          target="_blank" 
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline uppercase tracking-wider mt-2"
                        >
                          View on Roblox <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                      <Button
                        variant="destructive"
                        size="icon"
                        className="rounded-none opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleDelete(product.id)}
                        disabled={deleteProduct.isPending}
                        data-testid={`button-delete-${product.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          <div>
            <Card className="rounded-none border-border bg-card shadow-none sticky top-8">
              <CardHeader className="border-b border-border">
                <CardTitle className="text-lg uppercase tracking-wide text-primary flex items-center gap-2">
                  <Plus className="h-4 w-4" /> Add Product
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleCreate} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-xs uppercase tracking-widest text-muted-foreground">Product Name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="rounded-none border-border focus-visible:ring-primary font-mono text-sm"
                      placeholder="e.g. VIP Access"
                      required
                      data-testid="input-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gamePassId" className="text-xs uppercase tracking-widest text-muted-foreground">GamePass ID</Label>
                    <Input
                      id="gamePassId"
                      value={gamePassId}
                      onChange={(e) => setGamePassId(e.target.value)}
                      className="rounded-none border-border focus-visible:ring-primary font-mono text-sm"
                      placeholder="e.g. 12345678"
                      required
                      data-testid="input-gamePassId"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-xs uppercase tracking-widest text-muted-foreground">Description (Optional)</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="rounded-none border-border focus-visible:ring-primary font-mono text-sm min-h-[100px]"
                      placeholder="Details about this game pass..."
                      data-testid="input-description"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full rounded-none font-bold uppercase tracking-widest"
                    disabled={createProduct.isPending || !name || !gamePassId}
                    data-testid="button-submit"
                  >
                    {createProduct.isPending ? "Adding..." : "Add Product"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
